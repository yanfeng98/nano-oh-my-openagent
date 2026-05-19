import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentOverrideConfig } from "../types"
import type { CategoryConfig } from "../../config/schema"
import { deepMerge, migrateAgentConfig } from "../../shared"
import { resolvePromptAppend } from "./resolve-file-uri"
import { applyEnvironmentContext } from "./environment-context"

export function applyCategoryOverride(
  config: AgentConfig,
  categoryName: string,
  mergedCategories: Record<string, CategoryConfig>
): AgentConfig {
  const categoryConfig = mergedCategories[categoryName]
  if (!categoryConfig) return config
  return deepMerge(config, categoryConfig as Partial<AgentConfig>) as AgentConfig
}

export function mergeAgentConfig(
  base: AgentConfig,
  override: AgentOverrideConfig,
  directory?: string
): AgentConfig {
  const migratedOverride = migrateAgentConfig(override as Record<string, unknown>) as AgentOverrideConfig
  const { prompt_append, ...rest } = migratedOverride
  const merged = deepMerge(base, rest as Partial<AgentConfig>)

  if (prompt_append && merged.prompt) {
    merged.prompt = merged.prompt + "\n" + resolvePromptAppend(prompt_append, directory)
  }

  return merged
}

export function finalizeAgentConfig(params: {
  config: AgentConfig
  override?: AgentOverrideConfig
  mergedCategories: Record<string, CategoryConfig>
  directory?: string
  disableOmoEnv?: boolean
}): AgentConfig {
  let config = params.config

  if (params.override?.category) {
    config = applyCategoryOverride(config, params.override.category, params.mergedCategories)
  }

  config = applyEnvironmentContext(config, params.directory, {
    disableOmoEnv: params.disableOmoEnv,
  })

  if (params.override) {
    config = mergeAgentConfig(config, params.override, params.directory)
  }

  return config
}
