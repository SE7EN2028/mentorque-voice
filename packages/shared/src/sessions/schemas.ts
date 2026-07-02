import { z } from 'zod'
import { INTERVIEW_TYPES } from './interview-type.js'
import { SESSION_STATUSES } from './session-status.js'

/**
 * Single source of truth for session create/update validation — imported by
 * the server (Express middleware) and the client (interview setup form) so
 * the two can never drift apart.
 */
export const createSessionSchema = z.object({
  interviewType: z.enum(INTERVIEW_TYPES),
  // Extracted server-side by the resume-upload endpoint, capped to match the
  // truncation limit enforced there — never a raw file upload itself.
  resumeContext: z.string().trim().max(20_000).optional(),
  jobDescriptionContext: z.string().trim().max(10_000).optional(),
})
export type CreateSessionInput = z.infer<typeof createSessionSchema>

export const updateSessionSchema = z.object({
  status: z.enum(SESSION_STATUSES).optional(),
  resumeContext: z.string().trim().max(20_000).optional(),
  jobDescriptionContext: z.string().trim().max(10_000).optional(),
})
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>
