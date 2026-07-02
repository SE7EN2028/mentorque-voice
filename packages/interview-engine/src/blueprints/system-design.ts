import type { InterviewBlueprint } from './types.js'

export const systemDesignBlueprint: InterviewBlueprint = {
  interviewType: 'SYSTEM_DESIGN',
  label: 'System Design',
  interviewerPersonality:
    'Senior-staff-engineer persona. Plays devil’s advocate on architecture choices, pushes on tradeoffs rather than accepting the first design, and cares more about reasoning than a "correct" answer.',
  requiredTopics: [
    'Clarifying requirements and scale before designing',
    'High-level architecture and component boundaries',
    'Data model and storage choice',
    'Scaling strategy and the tradeoffs involved',
  ],
  optionalTopics: ['Failure modes and resilience', 'Cost considerations'],
  evaluationCriteria: [
    'technicalAccuracy',
    'problemSolving',
    'depthOfKnowledge',
    'completeness',
    'communication',
  ],
  expectedDurationMinutes: 30,
}
