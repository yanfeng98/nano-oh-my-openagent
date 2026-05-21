import type { AvailableSkill } from "../agents/dynamic-agent-prompt-builder"
import type { OhMyOpenCodeConfig } from "../config"
import type { BrowserAutomationProvider } from "../config/schema/browser-automation"
import type {
  LoadedSkill,
  SkillScope,
} from "../features/opencode-skill-loader/types"

import {
  discoverConfigSourceSkills,
  discoverUserClaudeSkills,
  discoverProjectClaudeSkills,
  discoverOpencodeGlobalSkills,
  discoverOpencodeProjectSkills,
  discoverProjectAgentsSkills,
  discoverGlobalAgentsSkills,
  mergeSkills,
} from "../features/opencode-skill-loader"
import { createBuiltinSkills } from "../features/builtin-skills"
import { getSystemMcpServerNames } from "../features/claude-code-mcp-loader"

export type SkillContext = {
  mergedSkills: LoadedSkill[]
  availableSkills: AvailableSkill[]
  browserProvider: BrowserAutomationProvider
  disabledSkills: Set<string>
}

const PROVIDER_GATED_SKILL_NAMES = new Set(["agent-browser", "playwright"])

function mapScopeToLocation(scope: SkillScope): AvailableSkill["location"] {
  if (scope === "user" || scope === "opencode") return "user"
  if (scope === "project" || scope === "opencode-project") return "project"
  return "plugin"
}

export async function createSkillContext(args: {
  directory: string
  pluginConfig: OhMyOpenCodeConfig
}): Promise<SkillContext> {
  const { directory, pluginConfig } = args

  const browserProvider: BrowserAutomationProvider =
    pluginConfig.browser_automation_engine?.provider ?? "playwright"

  const disabledSkills = new Set<string>(pluginConfig.disabled_skills ?? [])
  const includeClaudeSkills = pluginConfig.claude_code?.skills !== false

  const [
    configSourceSkills,
    userSkills,
    globalSkills,
    projectSkills,
    opencodeProjectSkills,
    agentsProjectSkills,
    agentsGlobalSkills,
  ] = await Promise.all([
    discoverConfigSourceSkills({
      config: pluginConfig.skills,
      configDir: directory,
    }),
    includeClaudeSkills ? discoverUserClaudeSkills() : Promise.resolve([]),
    discoverOpencodeGlobalSkills(),
    includeClaudeSkills ? discoverProjectClaudeSkills(directory) : Promise.resolve([]),
    discoverOpencodeProjectSkills(directory),
    discoverProjectAgentsSkills(directory),
    discoverGlobalAgentsSkills(),
  ])

  const builtinSkills = createBuiltinSkills({
    browserProvider,
    disabledSkills,
  })

  const allDiscovered = [
    ...configSourceSkills,
    ...userSkills,
    ...globalSkills,
    ...projectSkills,
    ...opencodeProjectSkills,
    ...agentsProjectSkills,
    ...agentsGlobalSkills,
  ].filter((skill) => {
    if (!PROVIDER_GATED_SKILL_NAMES.has(skill.name)) return true
    return skill.name === browserProvider
  })

  const mergedSkills = mergeSkills(
    builtinSkills,
    pluginConfig.skills,
    allDiscovered,
    { configDir: directory },
  )

  const systemMcpNames = getSystemMcpServerNames()
  const finalSkills = mergedSkills.filter((skill) => {
    if (!skill.mcpConfig) return true
    return !Object.keys(skill.mcpConfig).some((name) => systemMcpNames.has(name))
  })

  const availableSkills: AvailableSkill[] = finalSkills.map((skill) => ({
    name: skill.name,
    description: skill.definition.description ?? "",
    location: mapScopeToLocation(skill.scope),
  }))

  return {
    mergedSkills: finalSkills,
    availableSkills,
    browserProvider,
    disabledSkills,
  }
}
