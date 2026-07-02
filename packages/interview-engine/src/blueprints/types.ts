import type { InterviewType } from '@mentorque/shared'
import type { EvaluationDimension } from '../types/evaluation.js'

/**
 * Configuration for one interview type — topics, personality, and which
 * evaluation dimensions apply. No questions here: the model generates every
 * question live from this config plus the conversation so far.
 */
export interface InterviewBlueprint {
  interviewType: InterviewType
  label: string
  interviewerPersonality: string
  requiredTopics: string[]
  optionalTopics: string[]
  evaluationCriteria: EvaluationDimension[]
  expectedDurationMinutes: number
}
