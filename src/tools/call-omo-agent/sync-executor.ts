import type { CallOmoAgentArgs, ToolContextWithMetadata } from "./types"
import type { PluginInput } from "@opencode-ai/plugin"
import type { BackgroundManager } from "../../features/background-agent"
import { subagentSessions, syncSubagentSessions } from "../../features/claude-code-session-state"
import { clearSessionFallbackChain, setSessionFallbackChain } from "../../hooks/model-fallback/hook"
import { getAgentToolRestrictions, log } from "../../shared"
import type { FallbackEntry } from "../../shared/model-requirements"
import { waitForCompletion } from "./completion-poller"
import { processMessages } from "./message-processor"
import { createOrGetSession } from "./session-creator"

type SessionWithPromptAsync = {
  promptAsync: (opts: { path: { id: string }; body: Record<string, unknown> }) => Promise<unknown>
}

export async function executeSync(
  args: CallOmoAgentArgs,
  toolContext: ToolContextWithMetadata,
  ctx: PluginInput,
  backgroundManager: BackgroundManager,
  model?: { providerID: string; modelID: string; variant?: string },
  fallbackChain?: FallbackEntry[],
): Promise<string> {
  let sessionID: string | undefined
  let createdSessionForExecution = false
  let appliedFallbackChain = false
  let spawnReservation: Awaited<ReturnType<BackgroundManager["reserveSubagentSpawn"]>> | undefined

  try {
    if (!args.session_id) {
      spawnReservation = await backgroundManager.reserveSubagentSpawn(toolContext.sessionID)
    }

    const session = await createOrGetSession(args, toolContext, ctx)
    sessionID = session.sessionID
    createdSessionForExecution = session.isNew
    subagentSessions.add(sessionID)
    syncSubagentSessions.add(sessionID)

    if (session.isNew) {
      spawnReservation?.commit()
    }

    if (fallbackChain && fallbackChain.length > 0) {
      setSessionFallbackChain(sessionID, fallbackChain)
      appliedFallbackChain = true
    }

    await Promise.resolve(
      toolContext.metadata?.({
        title: args.description,
        metadata: { sessionId: sessionID },
      })
    )

    log(`[call_omo_agent] Sending prompt to session ${sessionID}`)
    log(`[call_omo_agent] Prompt text:`, args.prompt.substring(0, 100))

    try {
      await (ctx.client.session as unknown as SessionWithPromptAsync).promptAsync({
        path: { id: sessionID },
        body: {
          agent: args.subagent_type,
          ...(model
            ? { model: { providerID: model.providerID, modelID: model.modelID } }
            : {}),
          ...(model?.variant ? { variant: model.variant } : {}),
          tools: {
            ...getAgentToolRestrictions(args.subagent_type),
            task: false,
            question: false,
          },
          parts: [{ type: "text", text: args.prompt }],
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log(`[call_omo_agent] Prompt error:`, errorMessage)
      if (errorMessage.includes("agent.name") || errorMessage.includes("undefined")) {
        return `Error: Agent "${args.subagent_type}" not found. Make sure the agent is registered in your opencode.json or provided by a plugin.\n\n<task_metadata>\nsession_id: ${sessionID}\n</task_metadata>`
      }
      return `Error: Failed to send prompt: ${errorMessage}\n\n<task_metadata>\nsession_id: ${sessionID}\n</task_metadata>`
    }

    await waitForCompletion(sessionID, toolContext, ctx)

    const responseText = await processMessages(sessionID, ctx)

    return responseText + "\n\n" + ["<task_metadata>", `session_id: ${sessionID}`, "</task_metadata>"].join("\n")
  } catch (error) {
    spawnReservation?.rollback()
    throw error
  } finally {
    if (sessionID && appliedFallbackChain) {
      clearSessionFallbackChain(sessionID)
    }

    if (sessionID && createdSessionForExecution) {
      subagentSessions.delete(sessionID)
      syncSubagentSessions.delete(sessionID)
    }
  }
}
