import type { AgentConfig } from "@opencode-ai/sdk";

export type AgentMode = "primary" | "subagent" | "all";
export type AgentFactory = ((model: string) => AgentConfig) & {
  mode: AgentMode;
};
export type AgentCategory =
  | "exploration"
  | "specialist"
  | "advisor"
  | "utility";

export type AgentCost = "FREE" | "CHEAP" | "EXPENSIVE";
export interface DelegationTrigger {
  domain: string;
  trigger: string;
}

export interface AgentPromptMetadata {
  category: AgentCategory;
  cost: AgentCost;
  triggers: DelegationTrigger[];
  useWhen?: string[];
  avoidWhen?: string[];
  dedicatedSection?: string;
  promptAlias?: string;
  keyTrigger?: string;
}

function extractModelName(model: string): string {
  return model.includes("/") ? (model.split("/").pop() ?? model) : model;
}

export function isGptModel(model: string): boolean {
  const modelName = extractModelName(model).toLowerCase();
  return modelName.includes("gpt");
}

export function isGpt5_4Model(model: string): boolean {
  const modelName = extractModelName(model).toLowerCase();
  return modelName.includes("gpt-5.4") || modelName.includes("gpt-5-4");
}

export function isGpt5_3CodexModel(model: string): boolean {
  const modelName = extractModelName(model).toLowerCase();
  return modelName.includes("gpt-5.3-codex") || modelName.includes("gpt-5-3-codex");
}

const GEMINI_PROVIDERS = ["google/", "google-vertex/"];

export function isGeminiModel(model: string): boolean {
  if (GEMINI_PROVIDERS.some((prefix) => model.startsWith(prefix))) return true;

  if (
    model.startsWith("github-copilot/") &&
    extractModelName(model).toLowerCase().startsWith("gemini")
  )
    return true;

  const modelName = extractModelName(model).toLowerCase();
  return modelName.startsWith("gemini-");
}

export type BuiltinAgentName =
  | "sisyphus"
  | "hephaestus"
  | "oracle"
  | "librarian"
  | "explore"
  | "multimodal-looker"
  | "metis"
  | "momus"
  | "atlas"
  | "sisyphus-junior";

export type OverridableAgentName = "build" | BuiltinAgentName;

export type AgentName = BuiltinAgentName;

export type AgentOverrideConfig = Partial<AgentConfig> & {
  prompt_append?: string;
  variant?: string;
  fallback_models?: string | string[];
};

export type AgentOverrides = Partial<
  Record<OverridableAgentName, AgentOverrideConfig>
>;
