import { z } from "zod"
import { DynamicContextPruningConfigSchema } from "./dynamic-context-pruning"

export const ExperimentalConfigSchema = z.object({
  aggressive_truncation: z.boolean().optional(),
  auto_resume: z.boolean().optional(),
  preemptive_compaction: z.boolean().optional(),
  truncate_all_tool_outputs: z.boolean().optional(),
  dynamic_context_pruning: DynamicContextPruningConfigSchema.optional(),
  task_system: z.boolean().optional(),
  plugin_load_timeout_ms: z.number().min(1000).optional(),
  safe_hook_creation: z.boolean().optional(),
  disable_omo_env: z.boolean().optional(),
  hashline_edit: z.boolean().optional(),
  model_fallback_title: z.boolean().optional(),
})

export type ExperimentalConfig = z.infer<typeof ExperimentalConfigSchema>
