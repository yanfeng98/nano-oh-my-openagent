import type { DelegateTaskArgs, ToolContextWithMetadata } from "./types"
import type { ExecutorContext, ParentContext, SessionMessage } from "./executor-types"
import { isPlanFamily } from "./constants"
import { storeToolCallMetadata, formatDuration, formatDetailedError } from "./formatting"
import { getTaskToastManager } from "../../features/task-toast-manager"
import { getAgentToolRestrictions } from "../../shared/agent-tool-restrictions"
import { getMessageDir } from "../../shared"
import { promptWithModelSuggestionRetry } from "../../shared/model-suggestion-retry"
import { findNearestMessageWithFields } from "../../features/hook-message-injector"
import { setSessionTools } from "../../shared/session-tools-store"
import { normalizeSDKResponse } from "../../shared"
import { buildTaskPrompt } from "./prompt-builder"
import { getSessionTools } from "../../shared/session-tools-store"
import { pollSyncSession, fetchSyncResult } from "./sync-pipeline"

// ── background continuation ─────────────────────────────────────

export async function executeBackgroundContinuation(
  args: DelegateTaskArgs,
  ctx: ToolContextWithMetadata,
  executorCtx: ExecutorContext,
  parentContext: ParentContext
): Promise<string> {
  const { manager } = executorCtx

  try {
    const task = await manager.resume({
      sessionId: args.session_id!,
      prompt: args.prompt,
      parentSessionID: parentContext.sessionID,
      parentMessageID: parentContext.messageID,
      parentModel: parentContext.model,
      parentAgent: parentContext.agent,
      parentTools: getSessionTools(parentContext.sessionID),
    })

    const bgContMeta = {
      title: `Continue: ${task.description}`,
      metadata: {
        prompt: args.prompt,
        agent: task.agent,
        load_skills: args.load_skills,
        description: args.description,
        run_in_background: args.run_in_background,
        sessionId: task.sessionID,
        command: args.command,
        model: task.model ? { providerID: task.model.providerID, modelID: task.model.modelID } : undefined,
      },
    }
    await storeToolCallMetadata(ctx, bgContMeta)

    return `Background task continued.

Task ID: ${task.id}
Description: ${task.description}
Agent: ${task.agent}
Status: ${task.status}

Agent continues with full previous context preserved.
Use \`background_output\` with task_id="${task.id}" to check progress.

<task_metadata>
session_id: ${task.sessionID}
${task.agent ? `subagent: ${task.agent}\n` : ""}</task_metadata>`
  } catch (error) {
    return formatDetailedError(error, {
      operation: "Continue background task",
      args,
      sessionID: args.session_id,
    })
  }
}

// ── sync continuation ───────────────────────────────────────────

export async function executeSyncContinuation(
  args: DelegateTaskArgs,
  ctx: ToolContextWithMetadata,
  executorCtx: ExecutorContext,
): Promise<string> {
  const { client, syncPollTimeoutMs } = executorCtx
  const toastManager = getTaskToastManager()
  const taskId = `resume_sync_${args.session_id!.slice(0, 8)}`
  const startTime = new Date()

  if (toastManager) {
    toastManager.addTask({
      id: taskId,
      description: args.description,
      agent: "continue",
      isBackground: false,
    })
  }

  let syncContMeta: { title: string; metadata: Record<string, unknown> } | undefined

  let resumeAgent: string | undefined
  let resumeModel: { providerID: string; modelID: string } | undefined
  let resumeVariant: string | undefined
  let anchorMessageCount: number | undefined

  try {
    try {
      const messagesResp = await client.session.messages({ path: { id: args.session_id! } })
      const messages = normalizeSDKResponse(messagesResp, [] as SessionMessage[])
      anchorMessageCount = messages.length
      for (let i = messages.length - 1; i >= 0; i--) {
        const info = messages[i].info
        if (info?.agent || info?.model || (info?.modelID && info?.providerID)) {
          resumeAgent = info.agent
          resumeModel = info.model ?? (info.providerID && info.modelID ? { providerID: info.providerID, modelID: info.modelID } : undefined)
          resumeVariant = info.variant
          break
        }
      }
    } catch {
      const resumeMessageDir = getMessageDir(args.session_id!)
      const resumeMessage = resumeMessageDir ? findNearestMessageWithFields(resumeMessageDir) : null
      resumeAgent = resumeMessage?.agent
      resumeModel = resumeMessage?.model?.providerID && resumeMessage?.model?.modelID
        ? { providerID: resumeMessage.model.providerID, modelID: resumeMessage.model.modelID }
        : undefined
      resumeVariant = resumeMessage?.model?.variant
    }

    syncContMeta = {
      title: `Continue: ${args.description}`,
      metadata: {
        prompt: args.prompt,
        load_skills: args.load_skills,
        description: args.description,
        run_in_background: args.run_in_background,
        sessionId: args.session_id,
        sync: true,
        command: args.command,
        model: resumeModel,
      },
    }
    await storeToolCallMetadata(ctx, syncContMeta)

    const allowTask = isPlanFamily(resumeAgent)
    const effectivePrompt = buildTaskPrompt(args.prompt, resumeAgent)
    const tools = {
      ...(resumeAgent ? getAgentToolRestrictions(resumeAgent) : {}),
      task: allowTask,
      call_omo_agent: true,
      question: false,
    }
    setSessionTools(args.session_id!, tools)

    await promptWithModelSuggestionRetry(client, {
      path: { id: args.session_id! },
      body: {
        ...(resumeAgent !== undefined ? { agent: resumeAgent } : {}),
        ...(resumeModel !== undefined ? { model: resumeModel } : {}),
        ...(resumeVariant !== undefined ? { variant: resumeVariant } : {}),
        tools,
        parts: [{ type: "text", text: effectivePrompt }],
      },
    })
   } catch (promptError) {
     if (toastManager) {
       toastManager.removeTask(taskId)
     }
     const errorMessage = promptError instanceof Error ? promptError.message : String(promptError)
     return `Failed to send continuation prompt: ${errorMessage}\n\nSession ID: ${args.session_id}`
   }

    try {
      const pollError = await pollSyncSession(ctx, client, {
        sessionID: args.session_id!,
        agentToUse: resumeAgent ?? "continue",
        toastManager,
        taskId,
        anchorMessageCount,
      }, syncPollTimeoutMs)
      if (pollError) {
        return pollError
      }

      const result = await fetchSyncResult(client, args.session_id!, anchorMessageCount)
      if (!result.ok) {
        return result.error
      }

     const duration = formatDuration(startTime)

     return `Task continued and completed in ${duration}.

---

${result.textContent || "(No text output)"}

<task_metadata>
session_id: ${args.session_id}
${resumeAgent ? `subagent: ${resumeAgent}\n` : ""}</task_metadata>`
   } finally {
     if (toastManager) {
       toastManager.removeTask(taskId)
     }
   }
}
