import { z } from 'zod'
import { TURN_ACTIONS } from '@mentorque/shared'
import type { JsonSchemaNode } from '../llm/json-schema.js'

const scoreField = z.number().min(0).max(10).nullable()

/**
 * Validates the model's structured output before the engine accepts it —
 * malformed responses are rejected here, not discovered deeper in the
 * engine. Field order below matches TURN_RESPONSE_JSON_SCHEMA's
 * propertyOrder exactly on purpose (see that schema's comment).
 */
export const turnResponseSchema = z.object({
  reasoning: z.string(),
  evaluation: z.object({
    relevance: scoreField,
    completeness: scoreField,
    technicalAccuracy: scoreField,
    problemSolving: scoreField,
    depthOfKnowledge: scoreField,
    communication: scoreField,
    confidence: scoreField,
    starStructure: scoreField,
  }),
  decision: z.object({
    action: z.enum(TURN_ACTIONS),
    difficulty: z.number().int().min(1).max(5),
  }),
  memoryUpdates: z.object({
    newTechnologies: z.array(z.string()).default([]),
    newProject: z.object({ name: z.string(), summary: z.string() }).nullable().default(null),
    newStrength: z.string().nullable().default(null),
    newWeakness: z.string().nullable().default(null),
    topicCompleted: z.string().nullable().default(null),
    nextTopic: z.string().nullable().default(null),
    flagUnresolved: z.string().nullable().default(null),
    followUpResolved: z.string().nullable().default(null),
  }),
  assistantResponse: z.string().min(1),
})
export type TurnResponse = z.infer<typeof turnResponseSchema>

/**
 * The schema Gemini actually generates against. propertyOrder here is not
 * cosmetic: structured output is generated field-by-field in this order, so
 * "reasoning" and "evaluation" and "decision" are produced *before*
 * "assistantResponse" — the reply text is causally conditioned on the
 * evaluation/decision the model just committed to, all within one call.
 */
export const TURN_RESPONSE_JSON_SCHEMA: JsonSchemaNode = {
  type: 'object',
  propertyOrder: ['reasoning', 'evaluation', 'decision', 'memoryUpdates', 'assistantResponse'],
  required: ['reasoning', 'evaluation', 'decision', 'memoryUpdates', 'assistantResponse'],
  properties: {
    reasoning: {
      type: 'string',
      description:
        'Brief internal reasoning about the candidate’s last answer and what to do next. Not shown to the candidate.',
    },
    evaluation: {
      type: 'object',
      propertyOrder: [
        'relevance',
        'completeness',
        'technicalAccuracy',
        'problemSolving',
        'depthOfKnowledge',
        'communication',
        'confidence',
        'starStructure',
      ],
      required: [
        'relevance',
        'completeness',
        'technicalAccuracy',
        'problemSolving',
        'depthOfKnowledge',
        'communication',
        'confidence',
        'starStructure',
      ],
      properties: {
        relevance: { type: 'number', nullable: true },
        completeness: { type: 'number', nullable: true },
        technicalAccuracy: { type: 'number', nullable: true },
        problemSolving: { type: 'number', nullable: true },
        depthOfKnowledge: { type: 'number', nullable: true },
        communication: { type: 'number', nullable: true },
        confidence: { type: 'number', nullable: true },
        starStructure: { type: 'number', nullable: true },
      },
    },
    decision: {
      type: 'object',
      propertyOrder: ['action', 'difficulty'],
      required: ['action', 'difficulty'],
      properties: {
        action: { type: 'string', enum: [...TURN_ACTIONS] },
        difficulty: {
          type: 'integer',
          description:
            'Proposed difficulty for the NEXT question, 1-5. Guardrails may adjust this.',
        },
      },
    },
    memoryUpdates: {
      type: 'object',
      propertyOrder: [
        'newTechnologies',
        'newProject',
        'newStrength',
        'newWeakness',
        'topicCompleted',
        'nextTopic',
        'flagUnresolved',
        'followUpResolved',
      ],
      properties: {
        newTechnologies: { type: 'array', items: { type: 'string' } },
        newProject: {
          type: 'object',
          nullable: true,
          propertyOrder: ['name', 'summary'],
          properties: { name: { type: 'string' }, summary: { type: 'string' } },
        },
        newStrength: { type: 'string', nullable: true },
        newWeakness: { type: 'string', nullable: true },
        topicCompleted: {
          type: 'string',
          nullable: true,
          description:
            'Exact topic string from the required/optional topics list, verbatim, if now sufficiently covered.',
        },
        nextTopic: {
          type: 'string',
          nullable: true,
          description:
            'Exact topic string from the required/optional topics list, verbatim, only when action is ADVANCE_TOPIC.',
        },
        flagUnresolved: { type: 'string', nullable: true },
        followUpResolved: { type: 'string', nullable: true },
      },
    },
    assistantResponse: {
      type: 'string',
      description:
        'Exactly what the interviewer says out loud next. No meta-commentary, no stage directions, no markdown.',
    },
  },
}
