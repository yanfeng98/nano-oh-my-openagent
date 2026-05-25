import type { DelegateTaskArgs, OpencodeClient, ToolContextWithMetadata } from "./types"
import type { SessionMessage } from "./executor-types"
import { isPlanFamily } from "./constants"
import { buildTaskPrompt } from "./prompt-builder"
import { formatDetailedError } from "./formatting"
import { getDefaultSyncPollTimeoutMs, getTimingConfig } from "./timing"
import {
  promptSyncWithModelSuggestionRetry,
  promptWithModelSuggestionRetry,
} from "../../shared/model-suggestion-retry"
import { getAgentToolRestrictions } from "../../shared/agent-tool-restrictions"
import { setSessionTools } from "../../shared/session-tools-store"
import { createInternalAgentTextPart } from "../../shared/internal-initiator-marker"
import { log } from "../../shared/logger"
import { normalizeSDKResponse } from "../../shared"
import { QUESTION_DENIED_SESSION_PERMISSION } from "../../shared/question-denied-session-permission"

const NON_TERMINAL_FINISH_REASONS = new Set(["tool-calls", "unknown"])

// ── sync-session-creator ────────────────────────────────────────

export async function createSyncSession(
  client: OpencodeClient,
  input: { parentSessionID: string; agentToUse: string; description: string; defaultDirectory: string }
): Promise<{ ok: true; sessionID: string; parentDirectory: string } | { ok: false; error: string }> {
  const parentSession = client.session.get
    ? await client.session.get({ path: { id: input.parentSessionID } }).catch(() => null)
    : null
  const parentDirectory = parentSession?.data?.directory ?? input.defaultDirectory

  const createResult = await client.session.create({
    body: {
      parentID: input.parentSessionID,
      title: `${input.description} (@${input.agentToUse} subagent)`,
      permission: QUESTION_DENIED_SESSION_PERMISSION,
    } as Record<string, unknown>,
    query: {
      directory: parentDirectory,
    },
  })

  if (createResult.error) {
    return { ok: false, error: `Failed to create session: ${createResult.error}` }
  }

  return { ok: true, sessionID: createResult.data.id, parentDirectory }
}

// ── sync-prompt-sender ──────────────────────────────────────────

function isOracleAgent(agentToUse: string): boolean {
  return agentToUse.toLowerCase() === "oracle"
}

function isUnexpectedEofError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  const lowered = message.toLowerCase()
  return lowered.includes("unexpected eof") || lowered.includes("json parse error")
}

export async function sendSyncPrompt(
  client: OpencodeClient,
  input: {
    sessionID: string
    agentToUse: string
    args: DelegateTaskArgs
    systemContent: string | undefined
    categoryModel: { providerID: string; modelID: string; variant?: string } | undefined
    toastManager: { removeTask: (id: string) => void } | null | undefined
    taskId: string | undefined
  },
): Promise<string | null> {
  const allowTask = isPlanFamily(input.agentToUse)
  const effectivePrompt = buildTaskPrompt(input.args.prompt, input.agentToUse)
  const tools = {
    task: allowTask,
    call_omo_agent: true,
    question: false,
    ...getAgentToolRestrictions(input.agentToUse),
  }
  setSessionTools(input.sessionID, tools)

  const promptArgs = {
    path: { id: input.sessionID },
    body: {
      agent: input.agentToUse,
      system: input.systemContent,
      tools,
      parts: [createInternalAgentTextPart(effectivePrompt)],
      ...(input.categoryModel
        ? { model: { providerID: input.categoryModel.providerID, modelID: input.categoryModel.modelID } }
        : {}),
      ...(input.categoryModel?.variant ? { variant: input.categoryModel.variant } : {}),
    },
  }

  try {
    await promptWithModelSuggestionRetry(client, promptArgs)
  } catch (promptError) {
    if (isOracleAgent(input.agentToUse) && isUnexpectedEofError(promptError)) {
      try {
        await promptSyncWithModelSuggestionRetry(client, promptArgs)
        return null
      } catch (oracleRetryError) {
        promptError = oracleRetryError
      }
    }

    if (input.toastManager && input.taskId !== undefined) {
      input.toastManager.removeTask(input.taskId)
    }
    const errorMessage = promptError instanceof Error ? promptError.message : String(promptError)
    if (errorMessage.includes("agent.name") || errorMessage.includes("undefined")) {
      return formatDetailedError(new Error(`Agent "${input.agentToUse}" not found. Make sure the agent is registered in your opencode.json or provided by a plugin.`), {
        operation: "Send prompt to agent",
        args: input.args,
        sessionID: input.sessionID,
        agent: input.agentToUse,
        category: input.args.category,
      })
    }
    return formatDetailedError(promptError, {
      operation: "Send prompt",
      args: input.args,
      sessionID: input.sessionID,
      agent: input.agentToUse,
      category: input.args.category,
    })
  }

  return null
}

// ── sync-session-poller ─────────────────────────────────────────

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function abortSyncSession(client: OpencodeClient, sessionID: string, reason: string): void {
  log("[task] Aborting sync session", { sessionID, reason })
  void client.session.abort({
    path: { id: sessionID },
  }).catch((error: unknown) => {
    log("[task] Failed to abort sync session", { sessionID, reason, error: String(error) })
  })
}

export function isSessionComplete(messages: SessionMessage[]): boolean {
  let lastUser: SessionMessage | undefined
  let lastAssistant: SessionMessage | undefined

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (!lastAssistant && msg.info?.role === "assistant") lastAssistant = msg
    if (!lastUser && msg.info?.role === "user") lastUser = msg
    if (lastUser && lastAssistant) break
  }

  if (!lastAssistant?.info?.finish) return false
  if (NON_TERMINAL_FINISH_REASONS.has(lastAssistant.info.finish)) return false
  if (!lastUser?.info?.id || !lastAssistant?.info?.id) return false
  return lastUser.info.id < lastAssistant.info.id
}

export async function pollSyncSession(
  ctx: ToolContextWithMetadata,
  client: OpencodeClient,
  input: {
    sessionID: string
    agentToUse: string
    toastManager: { removeTask: (id: string) => void } | null | undefined
    taskId: string | undefined
    anchorMessageCount?: number
  },
  timeoutMs?: number
): Promise<string | null> {
  const syncTiming = getTimingConfig()
  const maxPollTimeMs = Math.max(timeoutMs ?? getDefaultSyncPollTimeoutMs(), 50)
  const pollStart = Date.now()
  let pollCount = 0
  let timedOut = false

  log("[task] Starting poll loop", { sessionID: input.sessionID, agentToUse: input.agentToUse })

  while (Date.now() - pollStart < maxPollTimeMs) {
    if (ctx.abort?.aborted) {
      log("[task] Aborted by user", { sessionID: input.sessionID })
      abortSyncSession(client, input.sessionID, "parent_abort")
      if (input.toastManager && input.taskId) input.toastManager.removeTask(input.taskId)
      return `Task aborted.\n\nSession ID: ${input.sessionID}`
    }

    await wait(syncTiming.POLL_INTERVAL_MS)
    pollCount++

    let statusResult: { data?: Record<string, { type: string }> }
    try {
      statusResult = await client.session.status()
    } catch (error) {
      log("[task] Poll status fetch failed, retrying", { sessionID: input.sessionID, error: String(error) })
      continue
    }
    const allStatuses = normalizeSDKResponse(statusResult, {} as Record<string, { type: string }>)
    const sessionStatus = allStatuses[input.sessionID]

    if (pollCount % 10 === 0) {
      log("[task] Poll status", {
        sessionID: input.sessionID,
        pollCount,
        elapsed: Math.floor((Date.now() - pollStart) / 1000) + "s",
        sessionStatus: sessionStatus?.type ?? "not_in_status",
      })
    }

    if (sessionStatus && sessionStatus.type !== "idle") {
      continue
    }

    let messagesResult: { data?: unknown } | SessionMessage[]
    try {
      messagesResult = await client.session.messages({ path: { id: input.sessionID } })
    } catch (error) {
      log("[task] Poll messages fetch failed, retrying", { sessionID: input.sessionID, error: String(error) })
      continue
    }
    const rawData = (messagesResult as { data?: unknown })?.data ?? messagesResult
    const msgs = Array.isArray(rawData) ? (rawData as SessionMessage[]) : []

    if (input.anchorMessageCount !== undefined && msgs.length <= input.anchorMessageCount) {
      continue
    }

    if (isSessionComplete(msgs)) {
      log("[task] Poll complete - terminal finish detected", { sessionID: input.sessionID, pollCount })
      break
    }

    const lastAssistant = [...msgs].reverse().find((m) => m.info?.role === "assistant")
    const hasAssistantText = msgs.some((m) => {
      if (m.info?.role !== "assistant") return false
      const parts = m.parts ?? []
      return parts.some((p) => {
        if (p.type !== "text" && p.type !== "reasoning") return false
        const text = (p.text ?? "").trim()
        return text.length > 0
      })
    })

    if (!lastAssistant?.info?.finish && hasAssistantText) {
      log("[task] Poll complete - assistant text detected (fallback)", {
        sessionID: input.sessionID,
        pollCount,
      })
      break
    }
  }

  if (Date.now() - pollStart >= maxPollTimeMs) {
    timedOut = true
    log("[task] Poll timeout reached", { sessionID: input.sessionID, pollCount })
    abortSyncSession(client, input.sessionID, "poll_timeout")
  }

  return timedOut ? `Poll timeout reached after ${maxPollTimeMs}ms for session ${input.sessionID}` : null
}

// ── sync-result-fetcher ─────────────────────────────────────────

export async function fetchSyncResult(
  client: OpencodeClient,
  sessionID: string,
  anchorMessageCount?: number
): Promise<{ ok: true; textContent: string } | { ok: false; error: string }> {
  const messagesResult = await client.session.messages({
    path: { id: sessionID },
  })

  if ((messagesResult as { error?: unknown }).error) {
    return { ok: false, error: `Error fetching result: ${(messagesResult as { error: unknown }).error}\n\nSession ID: ${sessionID}` }
  }

  const messages = normalizeSDKResponse(messagesResult, [] as SessionMessage[], {
    preferResponseOnMissingData: true,
  })

  const messagesAfterAnchor = anchorMessageCount !== undefined ? messages.slice(anchorMessageCount) : messages

  if (anchorMessageCount !== undefined && messagesAfterAnchor.length === 0) {
    return {
      ok: false,
      error: `Session completed but no new response was generated. The model may have failed silently.\n\nSession ID: ${sessionID}`,
    }
  }

  const assistantMessages = messagesAfterAnchor
    .filter((m) => m.info?.role === "assistant")
    .sort((a, b) => (b.info?.time?.created ?? 0) - (a.info?.time?.created ?? 0))
  const lastMessage = assistantMessages[0]

  if (anchorMessageCount !== undefined && !lastMessage) {
    return {
      ok: false,
      error: `Session completed but no new response was generated. The model may have failed silently.\n\nSession ID: ${sessionID}`,
    }
  }

  if (!lastMessage) {
    return { ok: false, error: `No assistant response found.\n\nSession ID: ${sessionID}` }
  }

  let textContent = ""
  for (const msg of assistantMessages) {
    const textParts = msg.parts?.filter((p) => p.type === "text" || p.type === "reasoning") ?? []
    const content = textParts.map((p) => p.text ?? "").filter(Boolean).join("\n")
    if (content) {
      textContent = content
      break
    }
  }

  return { ok: true, textContent }
}
