import {
  lsp_goto_definition,
  lsp_find_references,
  lsp_symbols,
  lsp_diagnostics,
  lsp_prepare_rename,
  lsp_rename,
  lspManager,
} from "./lsp"

export { lspManager }

export { createAstGrepTools } from "./ast-grep/tools"
export { createGrepTools } from "./grep/tools"
export { createGlobTools } from "./glob/tools"
export { createSkillTool } from "./skill/tools"
export { discoverCommandsSync } from "./slashcommand"
export { createSessionManagerTools } from "./session-manager/tools"

export { sessionExists } from "./session-manager/storage"

export { interactive_bash, startBackgroundCheck as startTmuxCheck } from "./interactive-bash"
export { createSkillMcpTool } from "./skill-mcp/tools"

import {
  createBackgroundOutput,
  createBackgroundCancel,
} from "./background-task/tools"
import type {
  BackgroundOutputManager,
  BackgroundCancelClient,
} from "./background-task/types"

import type { PluginInput, ToolDefinition } from "@opencode-ai/plugin"
import type { BackgroundManager } from "../features/background-agent"

type OpencodeClient = PluginInput["client"]

export { createCallOmoAgent } from "./call-omo-agent/tools"
export { createLookAt } from "./look-at"
export { createDelegateTask } from "./delegate-task"
export {
  createTaskCreateTool,
  createTaskGetTool,
  createTaskList,
  createTaskUpdateTool,
} from "./task"
export { createHashlineEditTool } from "./hashline-edit"

export function createBackgroundTools(manager: BackgroundManager, client: OpencodeClient): Record<string, ToolDefinition> {
  const outputManager: BackgroundOutputManager = manager
  const cancelClient: BackgroundCancelClient = client
  return {
    background_output: createBackgroundOutput(outputManager, client),
    background_cancel: createBackgroundCancel(manager, cancelClient),
  }
}

export const builtinTools: Record<string, ToolDefinition> = {
  lsp_goto_definition,
  lsp_find_references,
  lsp_symbols,
  lsp_diagnostics,
  lsp_prepare_rename,
  lsp_rename,
}
