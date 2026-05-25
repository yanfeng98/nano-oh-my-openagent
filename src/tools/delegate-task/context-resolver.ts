import type { GitMasterConfig, BrowserAutomationProvider } from "../../config/schema"
import type { ToolContextWithMetadata } from "./types"
import type { OpencodeClient } from "./types"
import type { ParentContext } from "./executor-types"
import { resolveMultipleSkillsAsync } from "../../features/opencode-skill-loader/skill-content"
import { discoverSkills } from "../../features/opencode-skill-loader"
import { resolveMessageContext } from "../../features/hook-message-injector"
import { getSessionAgent } from "../../features/claude-code-session-state"
import { log } from "../../shared/logger"
import { getMessageDir } from "../../shared/opencode-message-dir"

// ── skill resolution ────────────────────────────────────────────

export async function resolveSkillContent(
  skills: string[],
  options: { gitMasterConfig?: GitMasterConfig; browserProvider?: BrowserAutomationProvider; disabledSkills?: Set<string>; directory?: string }
): Promise<{ content: string | undefined; contents: string[]; error: string | null }> {
  if (skills.length === 0) {
    return { content: undefined, contents: [], error: null }
  }

  const { resolved, notFound } = await resolveMultipleSkillsAsync(skills, options)
  if (notFound.length > 0) {
    const allSkills = await discoverSkills({ includeClaudeCodePaths: true, directory: options?.directory })
    const available = allSkills.map(s => s.name).join(", ")
    return { content: undefined, contents: [], error: `Skills not found: ${notFound.join(", ")}. Available: ${available}` }
  }

  const contents = Array.from(resolved.values())
  return { content: contents.join("\n\n"), contents, error: null }
}

// ── parent context resolution ───────────────────────────────────

export async function resolveParentContext(
  ctx: ToolContextWithMetadata,
  client: OpencodeClient
): Promise<ParentContext> {
  const messageDir = getMessageDir(ctx.sessionID)
  const { prevMessage, firstMessageAgent } = await resolveMessageContext(
    ctx.sessionID,
    client,
    messageDir
  )

  const sessionAgent = getSessionAgent(ctx.sessionID)
  const parentAgent = ctx.agent ?? sessionAgent ?? firstMessageAgent ?? prevMessage?.agent

  log("[task] parentAgent resolution", {
    sessionID: ctx.sessionID,
    messageDir,
    ctxAgent: ctx.agent,
    sessionAgent,
    firstMessageAgent,
    prevMessageAgent: prevMessage?.agent,
    resolvedParentAgent: parentAgent,
  })

  const parentModel = prevMessage?.model?.providerID && prevMessage?.model?.modelID
    ? {
        providerID: prevMessage.model.providerID,
        modelID: prevMessage.model.modelID,
        ...(prevMessage.model.variant ? { variant: prevMessage.model.variant } : {}),
      }
    : undefined

  return {
    sessionID: ctx.sessionID,
    messageID: ctx.messageID,
    agent: parentAgent,
    model: parentModel,
  }
}
