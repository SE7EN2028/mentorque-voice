import type { InterviewBlueprint } from './types.js'

export const technicalBlueprint: InterviewBlueprint = {
  interviewType: 'TECHNICAL',
  label: 'Technical',
  interviewerPersonality:
    'Direct and technically rigorous. Asks "why" repeatedly instead of accepting a surface-level answer. Increases difficulty quickly when the candidate is clearly strong, and is not afraid of silence while they think.',
  requiredTopics: [
    'Depth in their strongest language or framework',
    'Their general problem-solving approach',
    'A real debugging or performance-optimization experience',
  ],
  optionalTopics: ['Testing philosophy', 'Code review practices'],
  evaluationCriteria: [
    'relevance',
    'completeness',
    'technicalAccuracy',
    'problemSolving',
    'depthOfKnowledge',
    'communication',
  ],
  expectedDurationMinutes: 25,
}
