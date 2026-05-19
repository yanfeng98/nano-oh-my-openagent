import { resolveModelPipeline } from "../../shared"
import type { ModelRequirement } from "../../shared/model-requirements"

export function resolveAgentModel(params: {
  uiSelectedModel?: string
  userModel?: string
  requirement?: ModelRequirement
  availableModels: Set<string>
  systemDefaultModel?: string
  isFirstRunNoCache?: boolean
}) {
  return resolveModelPipeline({
    intent: {
      uiSelectedModel: params.uiSelectedModel,
      userModel: params.userModel,
    },
    constraints: { availableModels: params.availableModels },
    policy: {
      fallbackChain: params.requirement?.fallbackChain,
      systemDefaultModel: params.systemDefaultModel,
      isFirstRunNoCache: params.isFirstRunNoCache,
    },
  })
}
