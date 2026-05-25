import type { PluginInput } from "@opencode-ai/plugin"
import { MULTIMODAL_LOOKER_AGENT } from "./constants"
import { fetchAvailableModels } from "../../shared/model-availability"
import { log } from "../../shared"
import { readConnectedProvidersCache } from "../../shared/connected-providers-cache"
import { resolveModelPipeline } from "../../shared/model-resolution-pipeline"
import { readVisionCapableModelsCache } from "../../shared/vision-capable-models-cache"
import type { FallbackEntry } from "../../shared/model-requirements"
import { AGENT_MODEL_REQUIREMENTS } from "../../shared/model-requirements"
import type { VisionCapableModel } from "../../plugin-state"

const MULTIMODAL_LOOKER_REQUIREMENT = AGENT_MODEL_REQUIREMENTS["multimodal-looker"]

type AgentModel = { providerID: string; modelID: string }

type ResolvedAgentMetadata = {
  agentModel?: AgentModel
  agentVariant?: string
}

type AgentInfo = {
  name?: string
  model?: AgentModel
  variant?: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getFullModelKey(model: AgentModel): string {
  return `${model.providerID}/${model.modelID}`
}

export function isVisionCapableAgentModel(
  agentModel: AgentModel | undefined,
  visionCapableModels: Array<AgentModel>,
): agentModel is AgentModel {
  if (!agentModel) {
    return false
  }

  return visionCapableModels.some((visionCapableModel) =>
    getFullModelKey(visionCapableModel) === getFullModelKey(agentModel),
  )
}

function parseAgentModel(model: string): AgentModel | undefined {
  const [providerID, ...modelIDParts] = model.split("/")
  const modelID = modelIDParts.join("/")
  if (!providerID || modelID.length === 0) {
    return undefined
  }

  return { providerID, modelID }
}

function toAgentInfo(value: unknown): AgentInfo | null {
  if (!isObject(value)) return null
  const name = typeof value["name"] === "string" ? value["name"] : undefined
  const variant = typeof value["variant"] === "string" ? value["variant"] : undefined
  const modelValue = value["model"]
  const model =
    isObject(modelValue) &&
    typeof modelValue["providerID"] === "string" &&
    typeof modelValue["modelID"] === "string"
      ? { providerID: modelValue["providerID"], modelID: modelValue["modelID"] }
      : undefined
  return { name, model, variant }
}

async function resolveRegisteredAgentMetadata(
  ctx: PluginInput,
): Promise<ResolvedAgentMetadata> {
  const agentsResult = await ctx.client.app?.agents?.()
  const agentsRaw = isObject(agentsResult) ? agentsResult["data"] : undefined
  const agents = Array.isArray(agentsRaw) ? agentsRaw.map(toAgentInfo).filter(Boolean) : []

  const matched = agents.find(
    (agent) => agent?.name?.toLowerCase() === MULTIMODAL_LOOKER_AGENT.toLowerCase()
  )

  return {
    agentModel: matched?.model,
    agentVariant: matched?.variant,
  }
}

function findHardcodedFallbackEntry(
  providerID: string,
  modelID: string,
): FallbackEntry | undefined {
  return MULTIMODAL_LOOKER_REQUIREMENT.fallbackChain.find((entry) =>
    entry.model === modelID && entry.providers.includes(providerID),
  )
}

function buildMultimodalLookerFallbackChain(
  visionCapableModels: VisionCapableModel[],
): FallbackEntry[] {
  const seen = new Set<string>()
  const fallbackChain: FallbackEntry[] = []

  for (const visionCapableModel of visionCapableModels) {
    const key = getFullModelKey(visionCapableModel)
    if (seen.has(key)) continue

    const hardcodedEntry = findHardcodedFallbackEntry(
      visionCapableModel.providerID,
      visionCapableModel.modelID,
    )

    seen.add(key)
    fallbackChain.push({
      providers: [visionCapableModel.providerID],
      model: visionCapableModel.modelID,
      ...(hardcodedEntry?.variant ? { variant: hardcodedEntry.variant } : {}),
    })
  }

  for (const entry of MULTIMODAL_LOOKER_REQUIREMENT.fallbackChain) {
    const providerModelKeys = entry.providers.map((providerID) =>
      getFullModelKey({ providerID, modelID: entry.model }),
    )
    if (providerModelKeys.every((key) => seen.has(key))) {
      continue
    }

    providerModelKeys.forEach((key) => {
      seen.add(key)
    })
    fallbackChain.push(entry)
  }

  return fallbackChain
}

async function resolveDynamicAgentMetadata(
  ctx: PluginInput,
  visionCapableModels = readVisionCapableModelsCache(),
): Promise<ResolvedAgentMetadata> {
  const fallbackChain = buildMultimodalLookerFallbackChain(visionCapableModels)
  const connectedProviders = readConnectedProvidersCache()
  const availableModels = await fetchAvailableModels(ctx.client)

  const resolution = resolveModelPipeline({
    constraints: {
      availableModels,
      connectedProviders,
    },
    policy: {
      fallbackChain,
    },
  })

  const agentModel = resolution ? parseAgentModel(resolution.model) : undefined
  if (!isVisionCapableAgentModel(agentModel, visionCapableModels)) {
    return {}
  }

  return {
    agentModel,
    agentVariant: resolution?.variant,
  }
}

function isConfiguredVisionModel(
  configuredModel: AgentModel | undefined,
  dynamicModel: AgentModel | undefined,
): boolean {
  if (!configuredModel || !dynamicModel) {
    return false
  }

  return getFullModelKey(configuredModel) === getFullModelKey(dynamicModel)
}

export async function resolveMultimodalLookerAgentMetadata(
  ctx: PluginInput
): Promise<ResolvedAgentMetadata> {
  try {
    const registeredMetadata = await resolveRegisteredAgentMetadata(ctx)
    const visionCapableModels = readVisionCapableModelsCache()
    const registeredModelIsVisionCapable = isVisionCapableAgentModel(
      registeredMetadata.agentModel,
      visionCapableModels,
    )

    const dynamicMetadata = await resolveDynamicAgentMetadata(ctx, visionCapableModels)

    if (
      registeredModelIsVisionCapable &&
      isConfiguredVisionModel(registeredMetadata.agentModel, dynamicMetadata.agentModel)
    ) {
      return {
        agentModel: registeredMetadata.agentModel,
        agentVariant: registeredMetadata.agentVariant ?? dynamicMetadata.agentVariant,
      }
    }

    if (dynamicMetadata.agentModel) {
      return dynamicMetadata
    }

    if (registeredModelIsVisionCapable) {
      return registeredMetadata
    }

    return {}
  } catch (error) {
    log("[look_at] Failed to resolve multimodal-looker model info", error)
    return {}
  }
}
