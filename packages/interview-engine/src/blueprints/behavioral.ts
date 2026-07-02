import type { InterviewBlueprint } from './types.js'

export const behavioralBlueprint: InterviewBlueprint = {
  interviewType: 'BEHAVIORAL',
  label: 'Behavioral',
  interviewerPersonality:
    'Warm and curious, but not a pushover. Listens for STAR structure (Situation, Task, Action, Result) and gently pushes for concrete specifics when an answer stays vague or generic.',
  requiredTopics: [
    'A time they led or took ownership of something',
    'A conflict or disagreement with a colleague',
    'A failure or mistake and what they learned',
    'An example of collaboration or teamwork',
  ],
  optionalTopics: ['Time management under pressure', 'Mentoring or helping a teammate grow'],
  evaluationCriteria: ['relevance', 'completeness', 'communication', 'confidence', 'starStructure'],
  expectedDurationMinutes: 20,
}
