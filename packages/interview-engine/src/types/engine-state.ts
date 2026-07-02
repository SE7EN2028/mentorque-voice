import { z } from 'zod'
import { EXPERIENCE_LEVELS, INTERVIEW_TYPES } from '@mentorque/shared'

export type InterviewStage = 'opening' | 'active' | 'closing'

/**
 * Structured, continuously-updated summary of what's happened so far —
 * this, not the growing raw transcript, is what gets fed into every prompt.
 * Keeps token usage roughly flat as the interview goes on and keeps the
 * model focused instead of re-reading an ever-longer history each turn.
 */
export interface ConversationMemory {
  candidateProfile: {
    name: string
    jobRole: string
    experienceLevel: (typeof EXPERIENCE_LEVELS)[number]
  }
  resumeContext: string | null
  jobDescriptionContext: string | null
  technologiesMentioned: string[]
  projectsMentioned: { name: string; summary: string }[]
  strengthsObserved: string[]
  weaknessesObserved: string[]
  completedTopics: string[]
  currentTopic: string | null
  unresolvedFollowUps: string[]
}

/**
 * The full persisted state for one interview session. Nests
 * ConversationMemory rather than storing it as a sibling column — one jsonb
 * blob, one source of truth, still logically separated at the type level
 * from the (separately-stored) raw Transcript.
 */
export interface EngineState {
  stage: InterviewStage
  interviewType: (typeof INTERVIEW_TYPES)[number]
  currentDifficulty: number
  followUpCountOnCurrentTopic: number
  questionsAskedCount: number
  startedAt: string | null
  elapsedMs: number
  maxDurationMs: number
  memory: ConversationMemory
}

const conversationMemorySchema = z.object({
  candidateProfile: z.object({
    name: z.string(),
    jobRole: z.string(),
    experienceLevel: z.enum(EXPERIENCE_LEVELS),
  }),
  resumeContext: z.string().nullable(),
  jobDescriptionContext: z.string().nullable(),
  technologiesMentioned: z.array(z.string()),
  projectsMentioned: z.array(z.object({ name: z.string(), summary: z.string() })),
  strengthsObserved: z.array(z.string()),
  weaknessesObserved: z.array(z.string()),
  completedTopics: z.array(z.string()),
  currentTopic: z.string().nullable(),
  unresolvedFollowUps: z.array(z.string()),
})

/** Validates EngineState read back out of Postgres jsonb — a corrupted or
 * hand-edited row fails loudly here instead of crashing deeper in the
 * engine with a confusing type error. */
export const engineStateSchema = z.object({
  stage: z.enum(['opening', 'active', 'closing']),
  interviewType: z.enum(INTERVIEW_TYPES),
  currentDifficulty: z.number().int().min(1).max(5),
  followUpCountOnCurrentTopic: z.number().int().min(0),
  questionsAskedCount: z.number().int().min(0),
  startedAt: z.string().nullable(),
  elapsedMs: z.number().min(0),
  maxDurationMs: z.number().min(0),
  memory: conversationMemorySchema,
}) satisfies z.ZodType<EngineState>
