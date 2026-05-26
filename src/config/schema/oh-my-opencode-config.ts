import { z } from "zod"
import { AnyMcpNameSchema } from "../../mcp/types"
import { BuiltinSkillNameSchema } from "./agent-schemas"
import { AgentOverridesSchema } from "./agent-overrides"
import { BabysittingConfigSchema, BackgroundTaskConfigSchema, BrowserAutomationConfigSchema, ClaudeCodeConfigSchema, CommentCheckerConfigSchema, GitMasterConfigSchema, NotificationConfigSchema, RalphLoopConfigSchema, StartWorkConfigSchema, WebsearchConfigSchema } from "./feature-schemas"
import { CategoriesConfigSchema } from "./categories"
import { BuiltinCommandNameSchema } from "./commands"
import { ExperimentalConfigSchema } from "./experimental"
import { HookNameSchema } from "./hooks"
import { RuntimeFallbackConfigSchema } from "./runtime-schemas"
import { SkillsConfigSchema } from "./skills"
import { SisyphusConfigSchema, SisyphusAgentConfigSchema } from "./agent-schemas"
import { TmuxConfigSchema } from "./tmux"

export const OhMyOpenCodeConfigSchema = z.object({
  $schema: z.string().optional(),
  new_task_system_enabled: z.boolean().optional(),
  default_run_agent: z.string().optional(),
  disabled_mcps: z.array(AnyMcpNameSchema).optional(),
  disabled_agents: z.array(z.string()).optional(),
  disabled_skills: z.array(BuiltinSkillNameSchema).optional(),
  disabled_hooks: z.array(HookNameSchema).optional(),
  disabled_commands: z.array(BuiltinCommandNameSchema).optional(),
  disabled_tools: z.array(z.string()).optional(),
  hashline_edit: z.boolean().optional(),
  model_fallback: z.boolean().optional(),
  agents: AgentOverridesSchema.optional(),
  categories: CategoriesConfigSchema.optional(),
  claude_code: ClaudeCodeConfigSchema.optional(),
  sisyphus_agent: SisyphusAgentConfigSchema.optional(),
  comment_checker: CommentCheckerConfigSchema.optional(),
  experimental: ExperimentalConfigSchema.optional(),
  auto_update: z.boolean().optional(),
  skills: SkillsConfigSchema.optional(),
  ralph_loop: RalphLoopConfigSchema.optional(),
  runtime_fallback: z.union([z.boolean(), RuntimeFallbackConfigSchema]).optional(),
  background_task: BackgroundTaskConfigSchema.optional(),
  notification: NotificationConfigSchema.optional(),
  babysitting: BabysittingConfigSchema.optional(),
  git_master: GitMasterConfigSchema.optional(),
  browser_automation_engine: BrowserAutomationConfigSchema.optional(),
  websearch: WebsearchConfigSchema.optional(),
  tmux: TmuxConfigSchema.optional(),
  sisyphus: SisyphusConfigSchema.optional(),
  start_work: StartWorkConfigSchema.optional(),
  _migrations: z.array(z.string()).optional(),
})

export type OhMyOpenCodeConfig = z.infer<typeof OhMyOpenCodeConfigSchema>
