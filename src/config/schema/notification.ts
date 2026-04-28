import { z } from "zod"

export const NotificationConfigSchema = z.object({
  force_enable: z.boolean().optional(),
})

export type NotificationConfig = z.infer<typeof NotificationConfigSchema>
