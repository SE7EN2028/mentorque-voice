import type { InterviewType } from './interview-type.js'
import type { SessionStatus } from './session-status.js'

/**
 * Public-facing session shape. Deliberately omits engineState/metadata —
 * those are internal bookkeeping for the conversation engine (later
 * phases), not something the client needs to see yet.
 */
export interface InterviewSessionDto {
  id: string
  interviewType: InterviewType
  status: SessionStatus
  resumeContext: string | null
  jobDescriptionContext: string | null
  createdAt: string
  startedAt: string | null
  endedAt: string | null
}
