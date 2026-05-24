import { tool, type PluginInput, type ToolDefinition } from "@opencode-ai/plugin"
import { ALLOWED_AGENTS, CALL_OMO_AGENT_DESCRIPTION } from "./constants"
import type { AllowedAgentType, CallOmoAgentArgs, ToolContextWithMetadata } from "./types"
import type { BackgroundManager } from "../../features/background-agent"
import type { AgentOverrides } from "../../config/schema"
import type { FallbackEntry } from "../../shared/model-requirements"
import { AGENT_MODEL_REQUIREMENTS } from "../../shared/model-requirements"
import { getAgentConfigKey } from "../../shared/agent-display-names"
import { normalizeModelFormat } from "../../shared/model-format-normalizer"
import { log } from "../../shared"
import { executeBackground } from "./background-executor"
import { executeSync } from "./sync-executor"

function resolveModelConfigForCallOmoAgent(args: {
  subagentType: string
  agentOverrides?: AgentOverrides
}): {
  model?: { providerID: string; modelID: string; variant?: string }
  fallbackChain?: FallbackEntry[]
} {
  const agentConfigKey = getAgentConfigKey(args.subagentType)
  const agentRequirement = AGENT_MODEL_REQUIREMENTS[agentConfigKey]
  const override = args.agentOverrides?.[agentConfigKey as keyof AgentOverrides]

  let model: { providerID: string; modelID: string; variant?: string } | undefined
  if (override?.model) {
    const normalized = normalizeModelFormat(override.model)
    if (normalized) {
      model = override.variant ? { ...normalized, variant: override.variant } : normalized
    }
  }

  return { model, fallbackChain: agentRequirement?.fallbackChain }
}

export function createCallOmoAgent(
  ctx: PluginInput,
  backgroundManager: BackgroundManager,
  disabledAgents: string[] = [],
  agentOverrides?: AgentOverrides,
): ToolDefinition {
  const agentDescriptions = ALLOWED_AGENTS.map(
    (name) => `- ${name}: Specialized agent for ${name} tasks`
  ).join("\n")
  const description = CALL_OMO_AGENT_DESCRIPTION.replace("{agents}", agentDescriptions)

  return tool({
    description,
    args: {
      description: tool.schema.string().describe("A short (3-5 words) description of the task"),
      prompt: tool.schema.string().describe("The task for the agent to perform"),
      subagent_type: tool.schema
        .string()
        .describe("The type of specialized agent to use for this task (explore or librarian only)"),
      run_in_background: tool.schema
        .boolean()
        .describe("REQUIRED. true: run asynchronously (use background_output to get results), false: run synchronously and wait for completion"),
      session_id: tool.schema.string().describe("Existing Task session to continue").optional(),
    },
    async execute(args: CallOmoAgentArgs, toolContext) {
      const toolCtx = toolContext as ToolContextWithMetadata
      log(`[call_omo_agent] Starting with agent: ${args.subagent_type}, background: ${args.run_in_background}`)

      if (
        !ALLOWED_AGENTS.some(
          (name) => name.toLowerCase() === args.subagent_type.toLowerCase(),
        )
      ) {
        return `Error: Invalid agent type "${args.subagent_type}". Only ${ALLOWED_AGENTS.join(", ")} are allowed.`
      }

      const normalizedAgent = args.subagent_type.toLowerCase() as AllowedAgentType
      args = { ...args, subagent_type: normalizedAgent }

      if (disabledAgents.some((disabled) => disabled.toLowerCase() === normalizedAgent)) {
        return `Error: Agent "${normalizedAgent}" is disabled via disabled_agents configuration. Remove it from disabled_agents in your oh-my-opencode.json to use it.`
      }

      const modelConfig = resolveModelConfigForCallOmoAgent({
        subagentType: args.subagent_type,
        agentOverrides,
      })

      if (args.run_in_background) {
        if (args.session_id) {
          return `Error: session_id is not supported in background mode. Use run_in_background=false to continue an existing session.`
        }
        return await executeBackground(args, toolCtx, backgroundManager, ctx.client, modelConfig.model, modelConfig.fallbackChain)
      }

      return await executeSync(args, toolCtx, ctx, backgroundManager, modelConfig.model, modelConfig.fallbackChain)
    },
  })
}
