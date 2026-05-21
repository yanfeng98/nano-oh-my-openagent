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

  for (const builtin of builtinSkills) {
    const loaded = builtinToLoadedSkill(builtin)
    skillMap.set(loaded.name, loaded)
  }

  for (const skill of fileSystemSkills) {
    const existing = skillMap.get(skill.name)
    if (!existing || SCOPE_PRIORITY[skill.scope] > SCOPE_PRIORITY[existing.scope]) {
      skillMap.set(skill.name, skill)
    }
  }

  const normalizedConfig = normalizeSkillsConfig(config)

  for (const [name, entry] of Object.entries(normalizedConfig.entries)) {
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
      const existing = skillMap.get(name)
      if (!existing || SCOPE_PRIORITY.config >= SCOPE_PRIORITY[existing.scope]) {
        const loaded = configEntryToLoadedSkill(name, entry, options.configDir)
        if (loaded) {
          skillMap.set(name, loaded)
        }
      }
    } else {
      const existing = skillMap.get(name)
      if (existing) {
        skillMap.set(name, mergeSkillDefinitions(existing, entry))
      }
    }
  }

  for (const name of normalizedConfig.disable) {
    skillMap.delete(name)
  }

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
