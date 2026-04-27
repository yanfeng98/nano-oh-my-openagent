import { z } from "zod"

export const DynamicContextPruningConfigSchema = z.object({
  enabled: z.boolean().default(false),
  notification: z.enum(["off", "minimal", "detailed"]).default("detailed"),
  turn_protection: z
    .object({
      enabled: z.boolean().default(true),
      turns: z.number().min(1).max(10).default(3),
    })
    .optional(),
  protected_tools: z.array(z.string()).default([
    "task",
    "todowrite",
    "todoread",
    "lsp_rename",
    "session_read",
    "session_write",
    "session_search",
  ]),
  strategies: z
    .object({
      deduplication: z
        .object({
          enabled: z.boolean().default(true),
        })
        .optional(),
      supersede_writes: z
        .object({
          enabled: z.boolean().default(true),
          aggressive: z.boolean().default(false),
        })
        .optional(),
      purge_errors: z
        .object({
          enabled: z.boolean().default(true),
          turns: z.number().min(1).max(20).default(5),
        })
        .optional(),
    })
    .optional(),
})

export type DynamicContextPruningConfig = z.infer<
  typeof DynamicContextPruningConfigSchema
>
