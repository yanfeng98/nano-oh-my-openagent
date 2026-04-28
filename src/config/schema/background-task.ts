import { z } from "zod"

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
