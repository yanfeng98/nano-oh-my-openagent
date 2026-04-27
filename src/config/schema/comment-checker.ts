import { z } from "zod"

export const CommentCheckerConfigSchema = z.object({
  custom_prompt: z.string().optional(),
})

export type CommentCheckerConfig = z.infer<typeof CommentCheckerConfigSchema>
