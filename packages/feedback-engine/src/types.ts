import type {
  AnswerEvaluation,
  ConversationMemory,
  InterviewBlueprint,
} from '@mentorque/interview-engine'
import type { InterviewType, TurnAction } from '@mentorque/shared'

/**
 * The feedback engine's own minimal transcript-turn shape — richer than
 * the conversation engine's EngineTranscriptTurn (which only needs
 * role+content for prompt-building) because deterministic metrics need
 * actionTaken/difficultyAtTurn too. Deliberately not Prisma's TranscriptTurn
 * row; the caller (packages/interview-session) maps DB rows into this.
 */
export interface FeedbackTranscriptTurn {
  role: 'INTERVIEWER' | 'CANDIDATE'
  content: string
  /** Only meaningful on INTERVIEWER turns. */
  actionTaken?: TurnAction
  /** Only meaningful on INTERVIEWER turns. */
  difficultyAtTurn?: number
}

/**
 * Everything the Feedback Engine needs, matching the phase spec's named
 * inputs: InterviewSession → interviewType/startedAt/endedAt/maxDurationMs;
 * Interview Blueprint → blueprint; Transcript → transcript; EngineState +
 * ConversationMemory → finalMemory (memory is nested inside EngineState in
 * this codebase, not a separate top-level object — see packages/interview-engine);
 * Evaluation History → evaluationHistory.
 */
export interface FeedbackEngineInput {
  interviewType: InterviewType
  blueprint: InterviewBlueprint
  transcript: FeedbackTranscriptTurn[]
  evaluationHistory: AnswerEvaluation[]
  finalMemory: ConversationMemory
  startedAt: string | null
  endedAt: string
  maxDurationMs: number
}
