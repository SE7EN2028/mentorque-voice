import { z } from 'zod'
import type { JsonSchemaNode } from '@mentorque/interview-engine'

/**
 * ONLY the qualitative fields — every numeric score lives in
 * DeterministicMetrics and is never asked of the model. Field order matches
 * FEEDBACK_RESPONSE_JSON_SCHEMA's propertyOrder exactly on purpose.
 */
export const feedbackResponseSchema = z.object({
  summary: z.string().min(1),
  topStrengths: z.array(z.string().min(1)).min(1),
  areasForImprovement: z.array(z.string().min(1)).min(1),
  missedOpportunities: z.array(z.string().min(1)),
  recommendedNextSteps: z.array(z.string().min(1)).min(1),
  actionablePracticeAdvice: z.array(z.string().min(1)).min(1),
})
export type FeedbackQualitativeResponse = z.infer<typeof feedbackResponseSchema>

export const FEEDBACK_RESPONSE_JSON_SCHEMA: JsonSchemaNode = {
  type: 'object',
  propertyOrder: [
    'summary',
    'topStrengths',
    'areasForImprovement',
    'missedOpportunities',
    'recommendedNextSteps',
    'actionablePracticeAdvice',
  ],
  required: [
    'summary',
    'topStrengths',
    'areasForImprovement',
    'missedOpportunities',
    'recommendedNextSteps',
    'actionablePracticeAdvice',
  ],
  properties: {
    summary: {
      type: 'string',
      description:
        'A 3-5 sentence narrative summary of the whole interview: how the candidate performed overall, referencing specific topics/answers from the transcript. No scores or numbers — those are already computed.',
    },
    topStrengths: {
      type: 'array',
      description:
        '2-4 concrete strengths, each referencing a specific moment or answer from the transcript, not generic praise.',
      items: { type: 'string' },
    },
    areasForImprovement: {
      type: 'array',
      description:
        '2-4 concrete weaknesses, each referencing a specific moment or answer from the transcript, not generic criticism.',
      items: { type: 'string' },
    },
    missedOpportunities: {
      type: 'array',
      description:
        'Specific moments where the candidate could have said more or gone deeper but did not — e.g. a follow-up that exposed a gap, a topic answered shallowly. Empty array if none stood out.',
      items: { type: 'string' },
    },
    recommendedNextSteps: {
      type: 'array',
      description:
        '2-4 concrete, prioritized things the candidate should do next given THIS interview specifically, not generic interview advice.',
      items: { type: 'string' },
    },
    actionablePracticeAdvice: {
      type: 'array',
      description:
        '2-4 specific practice exercises or resources tied to the weak areas actually observed in this interview.',
      items: { type: 'string' },
    },
  },
}
