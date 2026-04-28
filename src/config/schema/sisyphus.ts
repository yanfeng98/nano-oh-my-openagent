import { z } from "zod"

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
