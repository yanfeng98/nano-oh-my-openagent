import type { DelegateTaskArgs, ToolContextWithMetadata } from "./types"
import { storeToolMetadata } from "../../features/tool-metadata-store"
import { formatDuration } from "../shared/time-format"

export { formatDuration }

// ── error-formatting ────────────────────────────────────────────

export interface ErrorContext {
  operation: string
  args?: DelegateTaskArgs
  sessionID?: string
  agent?: string
  category?: string
}

export function formatDetailedError(error: unknown, ctx: ErrorContext): string {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  const lines: string[] = [`${ctx.operation} failed`, "", `**Error**: ${message}`]

  if (ctx.sessionID) {
    lines.push(`**Session ID**: ${ctx.sessionID}`)
  }

  if (ctx.agent) {
    lines.push(`**Agent**: ${ctx.agent}${ctx.category ? ` (category: ${ctx.category})` : ""}`)
  }

  if (ctx.args) {
    lines.push("", "**Arguments**:")
    lines.push(`- description: "${ctx.args.description}"`)
    lines.push(`- category: ${ctx.args.category ?? "(none)"}`)
    lines.push(`- subagent_type: ${ctx.args.subagent_type ?? "(none)"}`)
    lines.push(`- run_in_background: ${ctx.args.run_in_background}`)
    lines.push(`- load_skills: [${ctx.args.load_skills?.join(", ") ?? ""}]`)
    if (ctx.args.session_id) {
      lines.push(`- session_id: ${ctx.args.session_id}`)
    }
  }

  if (stack) {
    lines.push("", "**Stack Trace**:")
    lines.push("```")
    lines.push(stack.split("\n").slice(0, 10).join("\n"))
    lines.push("```")
  }

  return lines.join("\n")
}

// ── tool-metadata ───────────────────────────────────────────────

export async function storeToolCallMetadata(
  ctx: ToolContextWithMetadata,
  meta: { title?: string; metadata?: Record<string, unknown> },
): Promise<void> {
  await ctx.metadata?.(meta)
  if (ctx.callID) {
    storeToolMetadata(ctx.sessionID, ctx.callID, meta)
  }
}
