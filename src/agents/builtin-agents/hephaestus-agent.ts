import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentOverrides } from "../types"
import type { CategoryConfig } from "../../config/schema"
import type { AvailableAgent, AvailableCategory, AvailableSkill } from "../dynamic-agent-prompt-builder"
import { AGENT_MODEL_REQUIREMENTS, isAnyProviderConnected } from "../../shared"
import { createHephaestusAgent } from "../hephaestus"
import { finalizeAgentConfig } from "./agent-overrides"
import { resolveAgentModel } from "./model-resolution"

export function maybeCreateHephaestusConfig(input: {
  disabledAgents: string[]
  agentOverrides: AgentOverrides
  availableModels: Set<string>
  systemDefaultModel?: string
  isFirstRunNoCache: boolean
  availableAgents: AvailableAgent[]
  availableSkills: AvailableSkill[]
  availableCategories: AvailableCategory[]
  mergedCategories: Record<string, CategoryConfig>
  directory?: string
  useTaskSystem: boolean
  disableOmoEnv?: boolean
}): AgentConfig | undefined {
  const {
    disabledAgents,
    agentOverrides,
    availableModels,
    systemDefaultModel,
    isFirstRunNoCache,
    availableAgents,
    availableSkills,
    availableCategories,
    mergedCategories,
    directory,
    useTaskSystem,
    disableOmoEnv = false,
  } = input

  if (disabledAgents.includes("hephaestus")) return undefined

  const hephaestusOverride = agentOverrides["hephaestus"]
  const hephaestusRequirement = AGENT_MODEL_REQUIREMENTS["hephaestus"]
  const hasHephaestusExplicitConfig = hephaestusOverride !== undefined

  const hasRequiredProvider =
    !hephaestusRequirement?.requiresProvider ||
    hasHephaestusExplicitConfig ||
    isFirstRunNoCache ||
    isAnyProviderConnected(hephaestusRequirement.requiresProvider, availableModels)

  if (!hasRequiredProvider) return undefined

  const hephaestusResolution = resolveAgentModel({
    userModel: hephaestusOverride?.model,
    requirement: hephaestusRequirement,
    availableModels,
    systemDefaultModel,
    isFirstRunNoCache: isFirstRunNoCache && !hephaestusOverride?.model,
  })

  if (!hephaestusResolution) return undefined
  const { model: hephaestusModel, variant: hephaestusResolvedVariant } = hephaestusResolution

  let hephaestusConfig = createHephaestusAgent(
    hephaestusModel,
    availableAgents,
    undefined,
    availableSkills,
    availableCategories,
    useTaskSystem
  )

  hephaestusConfig = { ...hephaestusConfig, variant: hephaestusResolvedVariant ?? "medium" }

  return finalizeAgentConfig({
    config: hephaestusConfig,
    override: hephaestusOverride,
    mergedCategories,
    directory,
    disableOmoEnv,
  })
}
