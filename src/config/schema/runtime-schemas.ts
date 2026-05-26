import { z } from "zod"

// --- Fallback Models ---
export const FallbackModelsSchema = z.union([z.string(), z.array(z.string())])
export type FallbackModels = z.infer<typeof FallbackModelsSchema>

// --- Runtime Fallback ---
export const RuntimeFallbackConfigSchema = z.object({
  enabled: z.boolean().optional(),
  retry_on_errors: z.array(z.number()).optional(),
  max_fallback_attempts: z.number().min(1).max(20).optional(),
  cooldown_seconds: z.number().min(0).optional(),
  timeout_seconds: z.number().min(0).optional(),
  notify_on_fallback: z.boolean().optional(),
})
export type RuntimeFallbackConfig = z.infer<typeof RuntimeFallbackConfigSchema>
