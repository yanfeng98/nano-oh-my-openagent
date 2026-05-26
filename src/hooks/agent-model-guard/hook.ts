import type { PluginInput } from "@opencode-ai/plugin"
import { getSessionAgent, updateSessionAgent } from "../../features/claude-code-session-state"
import { log } from "../../shared"
import { getAgentConfigKey, getAgentDisplayName } from "../../shared/agent-display-names"

export interface AgentModelGuardConfig {
  /** Agent config key to guard (e.g. "sisyphus", "hephaestus") */
  agentKey: string
  /** Returns true when model violates the guard rule */
  isModelViolation: (modelID: string) => boolean
  /** Fallback agent name (e.g. "sisyphus", "hephaestus") */
  fallbackAgent: string
  toastTitle: string
  toastMessage: string
  /** If true, show warning instead of error and skip agent swap */
  allowFallthrough?: boolean
}

function showToast(
  ctx: PluginInput,
  sessionID: string,
  title: string,
  message: string,
  variant: "error" | "warning",
  logTag: string,
): void {
  ctx.client.tui.showToast({
    body: { title, message, variant, duration: 10000 },
  }).catch((error) => {
    log(`[${logTag}] Failed to show toast`, { sessionID, error })
  })
}

export function createAgentModelGuardHook(
  ctx: PluginInput,
  config: AgentModelGuardConfig,
) {
  const fallbackDisplay = getAgentDisplayName(config.fallbackAgent)

  return {
    "chat.message": async (input: {
      sessionID: string
      agent?: string
      model?: { providerID: string; modelID: string }
    }, output?: {
      message?: { agent?: string; [key: string]: unknown }
    }): Promise<void> => {
      const rawAgent = input.agent ?? getSessionAgent(input.sessionID) ?? ""
      const agentKey = getAgentConfigKey(rawAgent)
      const modelID = input.model?.modelID

      if (agentKey === config.agentKey && modelID && config.isModelViolation(modelID)) {
        const variant = config.allowFallthrough ? "warning" : "error"
        showToast(ctx, input.sessionID, config.toastTitle, config.toastMessage, variant, config.agentKey)
        if (config.allowFallthrough) return

        input.agent = fallbackDisplay
        if (output?.message) {
          output.message.agent = fallbackDisplay
        }
        updateSessionAgent(input.sessionID, fallbackDisplay)
      }
    },
  }
}

// -- Pre-configured instances --

import { isGptModel, isGpt5_4Model } from "../../agents/types"

export function createNoSisyphusGptHook(ctx: PluginInput) {
  return createAgentModelGuardHook(ctx, {
    agentKey: "sisyphus",
    isModelViolation: (modelID) => isGptModel(modelID) && !isGpt5_4Model(modelID),
    fallbackAgent: "hephaestus",
    toastTitle: "NEVER Use Sisyphus with GPT",
    toastMessage: [
      "Sisyphus works best with Claude Opus, and works fine with Kimi/GLM models.",
      "Do NOT use Sisyphus with GPT (except GPT-5.4 which has specialized support).",
      "For GPT models (other than 5.4), always use Hephaestus.",
    ].join("\n"),
  })
}

export function createNoHephaestusNonGptHook(
  ctx: PluginInput,
  options?: { allowNonGptModel?: boolean },
) {
  return createAgentModelGuardHook(ctx, {
    agentKey: "hephaestus",
    isModelViolation: (modelID) => !isGptModel(modelID),
    fallbackAgent: "sisyphus",
    toastTitle: "NEVER Use Hephaestus with Non-GPT",
    toastMessage: [
      "Hephaestus is designed exclusively for GPT models.",
      "Hephaestus is trash without GPT.",
      "For Claude/Kimi/GLM models, always use Sisyphus.",
    ].join("\n"),
    allowFallthrough: options?.allowNonGptModel === true,
  })
}
