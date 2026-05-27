import type { SkillScope, LoadedSkill } from "../../features/opencode-skill-loader/types"
import type { SkillMcpManager } from "../../features/skill-mcp-manager"
import type { GitMasterConfig } from "../../config/schema"
import type { CommandInfo } from "../slashcommand/types"

export interface SkillArgs {
  name: string
  user_message?: string
}

export interface SkillInfo {
  name: string
  description: string
  location?: string
  scope: SkillScope
  license?: string
  compatibility?: string
  metadata?: Record<string, string>
  allowedTools?: string[]
}

export interface SkillLoadOptions {
  opencodeOnly?: boolean
  skills?: LoadedSkill[]
  commands?: CommandInfo[]
  mcpManager?: SkillMcpManager
  getSessionID?: () => string
  gitMasterConfig?: GitMasterConfig
  disabledSkills?: Set<string>
  pluginsEnabled?: boolean
  enabledPluginsOverride?: Record<string, boolean>
}
