import { z } from "zod"
import { GitEnvPrefixSchema } from "./git-env-prefix"

// --- Notification ---
export const NotificationConfigSchema = z.object({
  force_enable: z.boolean().optional(),
})
export type NotificationConfig = z.infer<typeof NotificationConfigSchema>

// --- Start Work ---
export const StartWorkConfigSchema = z.object({
  auto_commit: z.boolean().default(true),
})
export type StartWorkConfig = z.infer<typeof StartWorkConfigSchema>

// --- Websearch ---
export const WebsearchProviderSchema = z.enum(["exa", "tavily"])
export const WebsearchConfigSchema = z.object({
  provider: WebsearchProviderSchema.optional(),
})
export type WebsearchProvider = z.infer<typeof WebsearchProviderSchema>
export type WebsearchConfig = z.infer<typeof WebsearchConfigSchema>

// --- Babysitting ---
export const BabysittingConfigSchema = z.object({
  timeout_ms: z.number().default(120000),
})
export type BabysittingConfig = z.infer<typeof BabysittingConfigSchema>

// --- Comment Checker ---
export const CommentCheckerConfigSchema = z.object({
  custom_prompt: z.string().optional(),
})
export type CommentCheckerConfig = z.infer<typeof CommentCheckerConfigSchema>

// --- Browser Automation ---
export const BrowserAutomationProviderSchema = z.enum([
  "playwright",
  "agent-browser",
  "dev-browser",
  "playwright-cli",
])
export const BrowserAutomationConfigSchema = z.object({
  provider: BrowserAutomationProviderSchema.default("playwright"),
})
export type BrowserAutomationProvider = z.infer<typeof BrowserAutomationProviderSchema>
export type BrowserAutomationConfig = z.infer<typeof BrowserAutomationConfigSchema>

// --- Ralph Loop ---
export const RalphLoopConfigSchema = z.object({
  enabled: z.boolean().default(false),
  default_max_iterations: z.number().min(1).max(1000).default(100),
  state_dir: z.string().optional(),
  default_strategy: z.enum(["reset", "continue"]).default("continue"),
})
export type RalphLoopConfig = z.infer<typeof RalphLoopConfigSchema>

// --- Git Master ---
export const GitMasterConfigSchema = z.object({
  commit_footer: z.union([z.boolean(), z.string()]).default(true),
  include_co_authored_by: z.boolean().default(true),
  git_env_prefix: GitEnvPrefixSchema,
})
export type GitMasterConfig = z.infer<typeof GitMasterConfigSchema>

// --- Background Task ---
export const BackgroundTaskConfigSchema = z.object({
  defaultConcurrency: z.number().min(1).optional(),
  providerConcurrency: z.record(z.string(), z.number().min(0)).optional(),
  modelConcurrency: z.record(z.string(), z.number().min(0)).optional(),
  maxDepth: z.number().int().min(1).optional(),
  maxDescendants: z.number().int().min(1).optional(),
  staleTimeoutMs: z.number().min(60000).optional(),
  messageStalenessTimeoutMs: z.number().min(60000).optional(),
  syncPollTimeoutMs: z.number().min(60000).optional(),
})
export type BackgroundTaskConfig = z.infer<typeof BackgroundTaskConfigSchema>

// --- Claude Code ---
export const ClaudeCodeConfigSchema = z.object({
  mcp: z.boolean().optional(),
  commands: z.boolean().optional(),
  skills: z.boolean().optional(),
  agents: z.boolean().optional(),
  hooks: z.boolean().optional(),
  plugins: z.boolean().optional(),
  plugins_override: z.record(z.string(), z.boolean()).optional(),
})
export type ClaudeCodeConfig = z.infer<typeof ClaudeCodeConfigSchema>
