import type { FeedbackDimensionScores } from '@mentorque/shared'

export const FEEDBACK_DIMENSION_LABELS: Record<keyof FeedbackDimensionScores, string> = {
  communication: 'Communication',
  technicalKnowledge: 'Technical Knowledge',
  problemSolving: 'Problem Solving',
  confidence: 'Confidence',
  depthOfKnowledge: 'Depth of Knowledge',
  starStructure: 'STAR Structure',
}

export const FEEDBACK_DIMENSION_ORDER: (keyof FeedbackDimensionScores)[] = [
  'communication',
  'technicalKnowledge',
  'problemSolving',
  'confidence',
  'depthOfKnowledge',
  'starStructure',
]
