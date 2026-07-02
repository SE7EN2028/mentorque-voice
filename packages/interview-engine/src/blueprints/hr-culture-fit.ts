import type { InterviewBlueprint } from './types.js'

export const hrCultureFitBlueprint: InterviewBlueprint = {
  interviewType: 'HR_CULTURE_FIT',
  label: 'HR / Culture Fit',
  interviewerPersonality:
    'Warm and conversational, genuinely curious about fit rather than adversarial. Still probes generic or rehearsed-sounding answers instead of taking them at face value.',
  requiredTopics: [
    'Motivation for this role and company',
    'What they value in a team or work environment',
    'How they handle ambiguity or changing priorities',
  ],
  optionalTopics: ['Career goals over the next few years', 'Logistics and availability'],
  evaluationCriteria: ['relevance', 'communication', 'confidence', 'starStructure'],
  expectedDurationMinutes: 15,
}
