import { getLLMProvider } from '@mentorque/interview-engine'
import type { LLMProvider } from '@mentorque/interview-engine'
import type { FeedbackReportDto } from '@mentorque/shared'
import { computeDeterministicMetrics } from './deterministic-metrics.js'
import { feedbackPromptBuilder } from './prompt-builder.js'
import { feedbackResponseSchema } from './response-schema.js'
import type { FeedbackEngineInput } from './types.js'

/**
 * The Feedback Engine's only entry point. Fully independent of LiveKit,
 * Express, and Prisma — callers hand in plain data (FeedbackEngineInput)
 * and get plain data back (FeedbackReportDto). Never called from inside the
 * Conversation Engine; the caller (packages/interview-session) invokes this
 * itself once it observes the interview has ended.
 */
export async function generateFeedbackReport(
  input: FeedbackEngineInput,
  llmProvider: LLMProvider = getLLMProvider(),
): Promise<FeedbackReportDto> {
  const metrics = computeDeterministicMetrics(input)
  const prompt = feedbackPromptBuilder.build(input, metrics)

  const qualitative = await llmProvider.generateStructured({
    systemInstruction: prompt.systemInstruction,
    messages: prompt.messages,
    responseSchema: prompt.responseSchema,
    validate: (value) => {
      const result = feedbackResponseSchema.safeParse(value)
      return result.success ? { success: true, data: result.data } : { success: false }
    },
  })

  return {
    overallScore: metrics.overallScore,
    dimensionScores: metrics.dimensionScores,
    topicCoverage: metrics.topicCoverage,
    difficultyReached: metrics.difficultyReached,
    difficultyProgression: metrics.difficultyProgression,
    durationMs: metrics.durationMs,
    summary: qualitative.summary,
    topStrengths: qualitative.topStrengths,
    areasForImprovement: qualitative.areasForImprovement,
    missedOpportunities: qualitative.missedOpportunities,
    recommendedNextSteps: qualitative.recommendedNextSteps,
    actionablePracticeAdvice: qualitative.actionablePracticeAdvice,
    generatedAt: new Date().toISOString(),
  }
}
