import type { AnswerEvaluation } from '@mentorque/interview-engine'
import type { TurnAction } from '@mentorque/shared'
import type { FeedbackDimensionScores, FeedbackTopicCoverageEntry } from '@mentorque/shared'
import type { FeedbackEngineInput } from './types.js'

const DIGGING_ACTIONS: TurnAction[] = ['FOLLOW_UP', 'PROBE', 'CHALLENGE']

const ALL_EVALUATION_DIMENSIONS = [
  'relevance',
  'completeness',
  'technicalAccuracy',
  'problemSolving',
  'depthOfKnowledge',
  'communication',
  'confidence',
  'starStructure',
] as const

export interface DeterministicMetrics {
  overallScore: number
  dimensionScores: FeedbackDimensionScores
  topicCoverage: FeedbackTopicCoverageEntry[]
  requiredTopicsCoveredCount: number
  requiredTopicsTotal: number
  difficultyReached: number
  difficultyProgression: number[]
  totalFollowUps: number
  questionsAskedCount: number
  durationMs: number
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** One decimal place, e.g. 7.3 — averaging several 0-10 integer scores
 * rarely lands on a whole number, and truncating to an int would throw
 * away real signal for no benefit. */
function averageDimension(
  evaluations: AnswerEvaluation[],
  dimension: (typeof ALL_EVALUATION_DIMENSIONS)[number],
): number | null {
  const values = evaluations
    .map((evaluation) => evaluation[dimension])
    .filter((value): value is number => value !== null)
  const result = average(values)
  return result === null ? null : Math.round(result * 10) / 10
}

/**
 * Everything a real interviewer's scorecard would contain that doesn't
 * require judgment to compute — this function never calls an LLM. The
 * report prompt shows these numbers to Gemini as ground truth to write
 * around, and the final FeedbackReport uses them as-is, unmodified by
 * whatever the model returns.
 */
export function computeDeterministicMetrics(input: FeedbackEngineInput): DeterministicMetrics {
  const dimensionScores: FeedbackDimensionScores = {
    communication: averageDimension(input.evaluationHistory, 'communication'),
    technicalKnowledge: averageDimension(input.evaluationHistory, 'technicalAccuracy'),
    problemSolving: averageDimension(input.evaluationHistory, 'problemSolving'),
    confidence: averageDimension(input.evaluationHistory, 'confidence'),
    depthOfKnowledge: averageDimension(input.evaluationHistory, 'depthOfKnowledge'),
    starStructure: averageDimension(input.evaluationHistory, 'starStructure'),
  }

  // The overall score folds in every dimension the candidate was actually
  // scored on, including relevance/completeness which aren't broken out
  // individually in the report — a fuller picture than the 6 named ones.
  const allDimensionAverages = ALL_EVALUATION_DIMENSIONS.map((dimension) =>
    averageDimension(input.evaluationHistory, dimension),
  ).filter((value): value is number => value !== null)
  const overallAverageOutOfTen = Math.max(0, Math.min(10, average(allDimensionAverages) ?? 0))
  const overallScore = Math.round(overallAverageOutOfTen * 10)

  const allTopics = [
    ...input.blueprint.requiredTopics.map((topic) => ({ topic, required: true })),
    ...input.blueprint.optionalTopics.map((topic) => ({ topic, required: false })),
  ]
  const topicCoverage: FeedbackTopicCoverageEntry[] = allTopics.map(({ topic, required }) => ({
    topic,
    required,
    covered: input.finalMemory.completedTopics.includes(topic),
  }))
  const requiredTopicsCoveredCount = topicCoverage.filter((t) => t.required && t.covered).length

  const interviewerTurns = input.transcript.filter((turn) => turn.role === 'INTERVIEWER')
  const difficultyProgression = interviewerTurns
    .map((turn) => turn.difficultyAtTurn)
    .filter((value): value is number => value !== undefined)
  const difficultyReached =
    difficultyProgression.length > 0 ? Math.max(...difficultyProgression) : 1

  const totalFollowUps = interviewerTurns.filter(
    (turn) => turn.actionTaken && DIGGING_ACTIONS.includes(turn.actionTaken),
  ).length

  const durationMs = input.startedAt
    ? new Date(input.endedAt).getTime() - new Date(input.startedAt).getTime()
    : 0

  return {
    overallScore,
    dimensionScores,
    topicCoverage,
    requiredTopicsCoveredCount,
    requiredTopicsTotal: input.blueprint.requiredTopics.length,
    difficultyReached,
    difficultyProgression,
    totalFollowUps,
    questionsAskedCount: interviewerTurns.length,
    durationMs: Math.max(0, durationMs),
  }
}
