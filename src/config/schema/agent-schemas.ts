import { z } from "zod"

// --- Sisyphus Agent ---
export const SisyphusAgentConfigSchema = z.object({
  disabled: z.boolean().optional(),
  default_builder_enabled: z.boolean().optional(),
  planner_enabled: z.boolean().optional(),
  replace_plan: z.boolean().optional(),
})
export type SisyphusAgentConfig = z.infer<typeof SisyphusAgentConfigSchema>

// --- Sisyphus ---
export const SisyphusTasksConfigSchema = z.object({
  storage_path: z.string().optional(),
  task_list_id: z.string().optional(),
  claude_code_compat: z.boolean().default(false),
})
export const SisyphusConfigSchema = z.object({
  tasks: SisyphusTasksConfigSchema.optional(),
})
export type SisyphusTasksConfig = z.infer<typeof SisyphusTasksConfigSchema>
export type SisyphusConfig = z.infer<typeof SisyphusConfigSchema>

// --- Agent Names ---
export const BuiltinAgentNameSchema = z.enum([
  "sisyphus",
  "hephaestus",
  "prometheus",
  "oracle",
  "librarian",
  "explore",
  "multimodal-looker",
  "metis",
  "momus",
  "atlas",
  "sisyphus-junior",
])

export const BuiltinSkillNameSchema = z.enum([
  "playwright",
  "agent-browser",
  "dev-browser",
  "frontend-ui-ux",
  "git-master",
])

export const OverridableAgentNameSchema = z.enum([
  "build",
  "plan",
  "sisyphus",
  "hephaestus",
  "sisyphus-junior",
  "OpenCode-Builder",
  "prometheus",
  "metis",
  "momus",
  "oracle",
  "librarian",
  "explore",
  "multimodal-looker",
  "atlas",
])

export const AgentNameSchema = BuiltinAgentNameSchema
export type AgentName = z.infer<typeof AgentNameSchema>
export type BuiltinSkillName = z.infer<typeof BuiltinSkillNameSchema>
