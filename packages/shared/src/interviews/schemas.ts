import { z } from 'zod'

export const sendMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(4_000),
})
export type SendMessageInput = z.infer<typeof sendMessageSchema>
