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

  // ── Step 1: Discover all skill sources in parallel ──
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

  // ── Step 2: Build builtin skills (provider selection happens here) ──
  const builtinSkills = createBuiltinSkills({
    browserProvider,
    disabledSkills,
  })

  // ── Step 3: Filter provider-gated skills from all discovered sources (single pass) ──
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

  // ── Step 4: Merge — builtins → config → filesystem (by scope priority), then apply config overrides ──
  const mergedSkills = mergeSkills(
    builtinSkills,
    pluginConfig.skills,
    allDiscovered,
    { configDir: directory },
  )

  // ── Step 5: Exclude skills whose MCP config conflicts with system MCP servers ──
  const systemMcpNames = getSystemMcpServerNames()
  const finalSkills = mergedSkills.filter((skill) => {
    if (!skill.mcpConfig) return true
    return !Object.keys(skill.mcpConfig).some((name) => systemMcpNames.has(name))
  })

  // ── Step 6: Convert to AvailableSkill format ──
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
