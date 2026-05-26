import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { AGENT_MODEL_REQUIREMENTS, CATEGORY_MODEL_REQUIREMENTS } from "../../../shared/model-requirements"
import type { ModelRequirement } from "../../../shared/model-requirements"
import { getOpenCodeCacheDir, parseJsonc } from "../../../shared"
import { loadMergedPluginConfig } from "../../../plugin-config"
import { CHECK_IDS, CHECK_NAMES } from "../constants"
import type { CheckResult, DoctorIssue } from "../types"

// --- Types ---
export interface AgentResolutionInfo {
  name: string
  requirement: ModelRequirement
  userOverride?: string
  userVariant?: string
  effectiveModel: string
  effectiveResolution: string
}

export interface CategoryResolutionInfo {
  name: string
  requirement: ModelRequirement
  userOverride?: string
  userVariant?: string
  effectiveModel: string
  effectiveResolution: string
}

export interface ModelResolutionInfo {
  agents: AgentResolutionInfo[]
  categories: CategoryResolutionInfo[]
}

export interface OmoConfig {
  agents?: Record<string, { model?: string; variant?: string; category?: string }>
  categories?: Record<string, { model?: string; variant?: string }>
}

export interface AvailableModelsInfo {
  providers: string[]
  modelCount: number
  cacheExists: boolean
}

// --- Config loader ---
function loadOmoConfig(): OmoConfig | null {
  return loadMergedPluginConfig(process.cwd(), { command: "doctor" })
}

// --- Cache loader ---
function getOpenCodeModelsCacheDir(): string {
  const xdgCache = process.env.XDG_CACHE_HOME
  if (xdgCache) return join(xdgCache, "opencode")
  return join(homedir(), ".cache", "opencode")
}

export function loadAvailableModelsFromCache(): AvailableModelsInfo {
  const cacheFile = join(getOpenCodeModelsCacheDir(), "models.json")

  if (!existsSync(cacheFile)) {
    return { providers: [], modelCount: 0, cacheExists: false }
  }

  try {
    const content = readFileSync(cacheFile, "utf-8")
    const data = parseJsonc<Record<string, { models?: Record<string, unknown> }>>(content)

    const providers = Object.keys(data)
    let modelCount = 0
    for (const providerId of providers) {
      const models = data[providerId]?.models
      if (models && typeof models === "object") {
        modelCount += Object.keys(models).length
      }
    }

    return { providers, modelCount, cacheExists: true }
  } catch {
    return { providers: [], modelCount: 0, cacheExists: false }
  }
}

// --- Variant resolution ---
function formatModelWithVariant(model: string, variant?: string): string {
  return variant ? `${model} (${variant})` : model
}

function getAgentOverride(
  agentName: string,
  config: OmoConfig
): { variant?: string; category?: string } | undefined {
  const agentOverrides = config.agents
  if (!agentOverrides) return undefined

  return (
    agentOverrides[agentName] ??
    Object.entries(agentOverrides).find(([key]) => key.toLowerCase() === agentName.toLowerCase())?.[1]
  )
}

function getEffectiveVariant(
  agentName: string,
  requirement: ModelRequirement,
  config: OmoConfig
): string | undefined {
  const agentOverride = getAgentOverride(agentName, config)

  if (agentOverride?.variant) {
    return agentOverride.variant
  }

  const categoryName = agentOverride?.category
  if (categoryName) {
    const categoryVariant = config.categories?.[categoryName]?.variant
    if (categoryVariant) {
      return categoryVariant
    }
  }

  const firstEntry = requirement.fallbackChain[0]
  return firstEntry?.variant ?? requirement.variant
}

function getCategoryEffectiveVariant(
  categoryName: string,
  requirement: ModelRequirement,
  config: OmoConfig
): string | undefined {
  const categoryVariant = config.categories?.[categoryName]?.variant
  if (categoryVariant) {
    return categoryVariant
  }
  const firstEntry = requirement.fallbackChain[0]
  return firstEntry?.variant ?? requirement.variant
}

// --- Effective model resolution ---
function formatProviderChain(providers: string[]): string {
  return providers.join(" → ")
}

function getEffectiveModel(requirement: ModelRequirement, userOverride?: string): string {
  if (userOverride) {
    return userOverride
  }
  const firstEntry = requirement.fallbackChain[0]
  if (!firstEntry) {
    return "unknown"
  }
  return `${firstEntry.providers[0]}/${firstEntry.model}`
}

function buildEffectiveResolution(requirement: ModelRequirement, userOverride?: string): string {
  if (userOverride) {
    return `User override: ${userOverride}`
  }
  const firstEntry = requirement.fallbackChain[0]
  if (!firstEntry) {
    return "No fallback chain defined"
  }
  return `Provider fallback: ${formatProviderChain(firstEntry.providers)} → ${firstEntry.model}`
}

// --- Detail builder ---
function buildModelResolutionDetails(options: {
  info: ModelResolutionInfo
  available: AvailableModelsInfo
  config: OmoConfig
}): string[] {
  const details: string[] = []
  const cacheFile = join(getOpenCodeCacheDir(), "models.json")

  details.push("═══ Available Models (from cache) ═══")
  details.push("")
  if (options.available.cacheExists) {
    details.push(`  Providers in cache: ${options.available.providers.length}`)
    details.push(
      `  Sample: ${options.available.providers.slice(0, 6).join(", ")}${options.available.providers.length > 6 ? "..." : ""}`
    )
    details.push(`  Total models: ${options.available.modelCount}`)
    details.push(`  Cache: ${cacheFile}`)
    details.push(`  Refresh: opencode models --refresh`)
  } else {
    details.push("  ⚠ Cache not found. Run 'opencode' to populate.")
  }
  details.push("")

  details.push("═══ Configured Models ═══")
  details.push("")
  details.push("Agents:")
  for (const agent of options.info.agents) {
    const marker = agent.userOverride ? "●" : "○"
    const display = formatModelWithVariant(
      agent.effectiveModel,
      getEffectiveVariant(agent.name, agent.requirement, options.config)
    )
    details.push(`  ${marker} ${agent.name}: ${display}`)
  }
  details.push("")
  details.push("Categories:")
  for (const category of options.info.categories) {
    const marker = category.userOverride ? "●" : "○"
    const display = formatModelWithVariant(
      category.effectiveModel,
      getCategoryEffectiveVariant(category.name, category.requirement, options.config)
    )
    details.push(`  ${marker} ${category.name}: ${display}`)
  }
  details.push("")
  details.push("● = user override, ○ = provider fallback")

  return details
}

// --- Main check functions ---
export function getModelResolutionInfo(): ModelResolutionInfo {
  const agents: AgentResolutionInfo[] = Object.entries(AGENT_MODEL_REQUIREMENTS).map(([name, requirement]) => ({
    name,
    requirement,
    effectiveModel: getEffectiveModel(requirement),
    effectiveResolution: buildEffectiveResolution(requirement),
  }))

  const categories: CategoryResolutionInfo[] = Object.entries(CATEGORY_MODEL_REQUIREMENTS).map(
    ([name, requirement]) => ({
      name,
      requirement,
      effectiveModel: getEffectiveModel(requirement),
      effectiveResolution: buildEffectiveResolution(requirement),
    })
  )

  return { agents, categories }
}

export function getModelResolutionInfoWithOverrides(config: OmoConfig): ModelResolutionInfo {
  const agents: AgentResolutionInfo[] = Object.entries(AGENT_MODEL_REQUIREMENTS).map(([name, requirement]) => {
    const userOverride = config.agents?.[name]?.model
    const userVariant = config.agents?.[name]?.variant
    return {
      name,
      requirement,
      userOverride,
      userVariant,
      effectiveModel: getEffectiveModel(requirement, userOverride),
      effectiveResolution: buildEffectiveResolution(requirement, userOverride),
    }
  })

  const categories: CategoryResolutionInfo[] = Object.entries(CATEGORY_MODEL_REQUIREMENTS).map(
    ([name, requirement]) => {
      const userOverride = config.categories?.[name]?.model
      const userVariant = config.categories?.[name]?.variant
      return {
        name,
        requirement,
        userOverride,
        userVariant,
        effectiveModel: getEffectiveModel(requirement, userOverride),
        effectiveResolution: buildEffectiveResolution(requirement, userOverride),
      }
    }
  )

  return { agents, categories }
}

export async function checkModels(): Promise<CheckResult> {
  const config = loadOmoConfig() ?? {}
  const info = getModelResolutionInfoWithOverrides(config)
  const available = loadAvailableModelsFromCache()
  const issues: DoctorIssue[] = []

  if (!available.cacheExists) {
    issues.push({
      title: "Model cache not found",
      description: "OpenCode model cache is missing, so model availability cannot be validated.",
      fix: "Run: opencode models --refresh",
      severity: "warning",
      affects: ["model resolution"],
    })
  }

  const overrideCount =
    info.agents.filter((agent) => Boolean(agent.userOverride)).length +
    info.categories.filter((category) => Boolean(category.userOverride)).length

  return {
    name: CHECK_NAMES[CHECK_IDS.MODELS],
    status: issues.length > 0 ? "warn" : "pass",
    message: `${info.agents.length} agents, ${info.categories.length} categories, ${overrideCount} override${overrideCount === 1 ? "" : "s"}`,
    details: buildModelResolutionDetails({ info, available, config }),
    issues,
  }
}

export const checkModelResolution = checkModels
