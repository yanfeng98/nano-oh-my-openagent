import type { LoadedSkill } from "./types"
import type { SkillsConfig } from "../../config/schema"
import type { BuiltinSkill } from "../builtin-skills/types"
import { builtinToLoadedSkill } from "./merger/builtin-skill-converter"
import { configEntryToLoadedSkill } from "./merger/config-skill-entry-loader"
import { mergeSkillDefinitions } from "./merger/skill-definition-merger"
import { normalizeSkillsConfig } from "./merger/skills-config-normalizer"
import { SCOPE_PRIORITY } from "./merger/scope-priority"

export interface MergeSkillsOptions {
  configDir?: string
}

export function mergeSkills(
  builtinSkills: BuiltinSkill[],
  config: SkillsConfig | undefined,
  fileSystemSkills: LoadedSkill[],
  options: MergeSkillsOptions = {}
): LoadedSkill[] {
  const skillMap = new Map<string, LoadedSkill>()

  // Pass A: Load builtins
  for (const builtin of builtinSkills) {
    const loaded = builtinToLoadedSkill(builtin)
    skillMap.set(loaded.name, loaded)
  }

  // Pass B: Merge filesystem skills by SCOPE_PRIORITY (higher priority wins)
  for (const skill of fileSystemSkills) {
    const existing = skillMap.get(skill.name)
    if (!existing || SCOPE_PRIORITY[skill.scope] > SCOPE_PRIORITY[existing.scope]) {
      skillMap.set(skill.name, skill)
    }
  }

  const normalizedConfig = normalizeSkillsConfig(config)

  // Pass C: Apply config entries (single pass — content entries add/replace;
  // override entries merge into whatever won in Pass B)
  for (const [name, entry] of Object.entries(normalizedConfig.entries)) {
    // Narrow entry type: boolean → SkillDefinition
    if (entry === false) {
      skillMap.delete(name)
      continue
    }
    if (entry === true) {
      continue
    }

    if (entry.disable) {
      skillMap.delete(name)
      continue
    }

    if (entry.template || entry.from) {
      // Content entry: add only if no higher-priority filesystem skill exists
      const existing = skillMap.get(name)
      if (!existing || SCOPE_PRIORITY.config >= SCOPE_PRIORITY[existing.scope]) {
        const loaded = configEntryToLoadedSkill(name, entry, options.configDir)
        if (loaded) {
          skillMap.set(name, loaded)
        }
      }
    } else {
      // Override entry: merge description/model/agent/etc. into existing skill
      const existing = skillMap.get(name)
      if (existing) {
        skillMap.set(name, mergeSkillDefinitions(existing, entry))
      }
    }
  }

  // Pass D: Apply top-level disable list
  for (const name of normalizedConfig.disable) {
    skillMap.delete(name)
  }

  // Pass E: Apply enable whitelist (when non-empty, only listed skills survive)
  if (normalizedConfig.enable.length > 0) {
    const enableSet = new Set(normalizedConfig.enable)
    for (const name of skillMap.keys()) {
      if (!enableSet.has(name)) {
        skillMap.delete(name)
      }
    }
  }

  return Array.from(skillMap.values())
}
