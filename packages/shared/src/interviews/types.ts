import type { TurnAction } from './turn-action.js'

export interface InterviewProgressDto {
  stage: 'opening' | 'active' | 'closing' | 'completed'
  questionsAskedCount: number
  requiredTopicsCovered: number
  requiredTopicsTotal: number
  currentTopic: string | null
  elapsedMs: number
  maxDurationMs: number
}

/** What every turn endpoint (start/message) returns. Deliberately excludes
 * the candidate's evaluation scores — those are persisted for the future
 * feedback report, not surfaced mid-interview. */
export interface InterviewTurnResponseDto {
  assistantMessage: string
  action: TurnAction
  difficulty: number
  progress: InterviewProgressDto
  isSessionOver: boolean
}
