import { createWebsearchConfig } from "./websearch"
import { context7 } from "./context7"
import { grep_app } from "./grep-app"
import type { OhMyOpenCodeConfig } from "../config/schema"
import type { RemoteMcpConfig } from "./types"

export { McpNameSchema, type McpName, type RemoteMcpConfig } from "./types"

export function createBuiltinMcps(disabledSet: Set<string>, config?: OhMyOpenCodeConfig) {
  const mcps: Record<string, RemoteMcpConfig> = {}

  if (!disabledSet.has("websearch")) {
    mcps.websearch = createWebsearchConfig(config?.websearch)
  }

  if (!disabledSet.has("context7")) {
    mcps.context7 = context7
  }

  if (!disabledSet.has("grep_app")) {
    mcps.grep_app = grep_app
  }

  return mcps
}
