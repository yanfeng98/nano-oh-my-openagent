import type { ToolContextWithMetadata } from "./types"
import { storeToolMetadata } from "../../features/tool-metadata-store"

export async function storeToolCallMetadata(
  ctx: ToolContextWithMetadata,
  meta: { title?: string; metadata?: Record<string, unknown> },
): Promise<void> {
  await ctx.metadata?.(meta)
  if (ctx.callID) {
    storeToolMetadata(ctx.sessionID, ctx.callID, meta)
  }
}
