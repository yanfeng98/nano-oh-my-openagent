import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentFactory, BuiltinAgentName, AgentOverrides, AgentPromptMetadata } from "../types"
import type { CategoryConfig } from "../../config/schema"
import type { AvailableAgent } from "../dynamic-agent-prompt-builder"
import { AGENT_MODEL_REQUIREMENTS } from "../../shared"
import { fuzzyMatchModel } from "../../shared/model-availability"
import { finalizeAgentConfig } from "./agent-overrides"
import { resolveAgentModel } from "./model-resolution"

export function collectPendingBuiltinAgents(input: {
  agentSources: Record<BuiltinAgentName, AgentFactory>
  agentMetadata: Partial<Record<BuiltinAgentName, AgentPromptMetadata>>
  disabledAgents: string[]
  agentOverrides: AgentOverrides
  directory?: string
  systemDefaultModel?: string
  mergedCategories: Record<string, CategoryConfig>
  uiSelectedModel?: string
  availableModels: Set<string>
  isFirstRunNoCache: boolean
  disableOmoEnv?: boolean
}): { pendingAgentConfigs: Map<string, AgentConfig>; availableAgents: AvailableAgent[] } {
  const {
    agentSources,
    agentMetadata,
    disabledAgents,
    agentOverrides,
    directory,
    systemDefaultModel,
    mergedCategories,
    uiSelectedModel,
    availableModels,
    isFirstRunNoCache,
    disableOmoEnv = false,
  } = input

  const availableAgents: AvailableAgent[] = []
  const pendingAgentConfigs: Map<string, AgentConfig> = new Map()

  for (const [name, source] of Object.entries(agentSources)) {
    const agentName = name as BuiltinAgentName

    if (agentName === "sisyphus") continue
    if (agentName === "hephaestus") continue
    if (agentName === "atlas") continue
    if (agentName === "sisyphus-junior") continue
    if (disabledAgents.some((name) => name.toLowerCase() === agentName.toLowerCase())) continue

    const override = agentOverrides[agentName]
      ?? Object.entries(agentOverrides).find(([key]) => key.toLowerCase() === agentName.toLowerCase())?.[1]
    const requirement = AGENT_MODEL_REQUIREMENTS[agentName]

    if (requirement?.requiresModel && availableModels) {
      if (fuzzyMatchModel(requirement.requiresModel, availableModels) === null) {
        continue
      }
    }

    const isPrimaryAgent = source.mode === "primary"

    const resolution = resolveAgentModel({
      uiSelectedModel: (isPrimaryAgent && !override?.model) ? uiSelectedModel : undefined,
      userModel: override?.model,
      requirement,
      availableModels,
      systemDefaultModel,
      isFirstRunNoCache: isFirstRunNoCache && !override?.model,
    })
    if (!resolution) continue
    const { model, variant: resolvedVariant } = resolution

    let config = source(model)

    if (resolvedVariant) {
      config = { ...config, variant: resolvedVariant }
    }

    config = finalizeAgentConfig({
      config,
      override,
      mergedCategories,
      directory,
      disableOmoEnv,
    })

    pendingAgentConfigs.set(name, config)

    const metadata = agentMetadata[agentName]
    if (metadata) {
      availableAgents.push({
        name: agentName,
        description: config.description ?? "",
        metadata,
      })
    }
  }

  return { pendingAgentConfigs, availableAgents }
}
