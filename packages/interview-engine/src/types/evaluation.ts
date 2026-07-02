/**
 * 8-dimension scoring of a single candidate answer. Not every dimension
 * applies to every interview type — inactive ones are `null`, not zero, so
 * they're excluded from any future averaging rather than dragging it down.
 */
export interface AnswerEvaluation {
  relevance: number | null
  completeness: number | null
  technicalAccuracy: number | null
  problemSolving: number | null
  depthOfKnowledge: number | null
  communication: number | null
  confidence: number | null
  starStructure: number | null
}

export const EVALUATION_DIMENSIONS = [
  'relevance',
  'completeness',
  'technicalAccuracy',
  'problemSolving',
  'depthOfKnowledge',
  'communication',
  'confidence',
  'starStructure',
] as const

export type EvaluationDimension = (typeof EVALUATION_DIMENSIONS)[number]
