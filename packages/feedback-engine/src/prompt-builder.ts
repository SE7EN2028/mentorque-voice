import type { LLMMessage } from '@mentorque/interview-engine'
import type { DeterministicMetrics } from './deterministic-metrics.js'
import type { FeedbackEngineInput, FeedbackTranscriptTurn } from './types.js'
import { FEEDBACK_RESPONSE_JSON_SCHEMA } from './response-schema.js'

export interface BuiltFeedbackPrompt {
  systemInstruction: string
  messages: LLMMessage[]
  responseSchema: typeof FEEDBACK_RESPONSE_JSON_SCHEMA
}

function formatTopicCoverage(metrics: DeterministicMetrics): string {
  return metrics.topicCoverage
    .map(
      (t) =>
        `${t.covered ? '[covered]' : '[missed]'} ${t.topic}${t.required ? ' (required)' : ' (optional)'}`,
    )
    .join('\n')
}

function formatDimensionScores(metrics: DeterministicMetrics): string {
  const { dimensionScores } = metrics
  return Object.entries(dimensionScores)
    .map(([dimension, score]) => `${dimension}: ${score === null ? 'not assessed' : `${score}/10`}`)
    .join('\n')
}

function buildSystemInstruction(input: FeedbackEngineInput, metrics: DeterministicMetrics): string {
  const { blueprint, finalMemory: memory } = input

  const lines = [
    `You are an expert interview coach writing a post-interview feedback report for a ${blueprint.label} interview that just concluded.`,
    `Interviewer personality used during the interview: ${blueprint.interviewerPersonality}`,
    '',
    `Candidate: ${memory.candidateProfile.name}, targeting ${memory.candidateProfile.jobRole} (${memory.candidateProfile.experienceLevel} level)`,
    memory.resumeContext ? `Resume highlights: ${memory.resumeContext}` : null,
    memory.jobDescriptionContext ? `Job description: ${memory.jobDescriptionContext}` : null,
    '',
    'The following metrics have ALREADY BEEN COMPUTED deterministically from the interview data. Do not recompute, restate as numbers, or contradict them in your prose — use them only as grounding context for what actually happened:',
    `Overall score: ${metrics.overallScore}/100`,
    formatDimensionScores(metrics),
    `Topic coverage:\n${formatTopicCoverage(metrics)}`,
    `Difficulty reached: ${metrics.difficultyReached}/5`,
    `Follow-up/probe/challenge questions asked: ${metrics.totalFollowUps}`,
    `Total questions asked: ${metrics.questionsAskedCount}`,
    `Interview duration: ${Math.round(metrics.durationMs / 60_000)} minutes`,
    `Technologies mentioned: ${memory.technologiesMentioned.join(', ') || 'none'}`,
    '',
    'RULES — follow exactly:',
    '- Write ONLY qualitative content per the response schema: summary, topStrengths, areasForImprovement, missedOpportunities, recommendedNextSteps, actionablePracticeAdvice.',
    '- Never invent or state a numeric score anywhere in your prose — scores are already finalized above and shown separately in the report.',
    '- Every strength, weakness, and missed opportunity must reference something specific and real from the transcript below — never generic interview advice that could apply to anyone.',
    '- Recommendations and practice advice must be concrete and actionable, tied to the specific weak areas actually observed in this interview.',
    '- missedOpportunities may be an empty array if nothing stood out — do not invent one to fill it.',
    '',
    'Full interview transcript follows as the conversation history.',
  ]

  return lines.filter((line): line is string => line !== null).join('\n')
}

function buildMessages(transcript: FeedbackTranscriptTurn[]): LLMMessage[] {
  const messages: LLMMessage[] = transcript.map((turn) => ({
    role: turn.role === 'CANDIDATE' ? 'user' : 'assistant',
    content: turn.content,
  }))

  messages.push({
    role: 'user',
    content: 'The interview has ended. Write the feedback report now, per the required schema.',
  })

  return messages
}

/**
 * Deliberately separate from interview-engine's promptBuilder — a one-time,
 * whole-transcript, backward-looking prompt has nothing in common with the
 * per-turn, recent-window, forward-looking prompt used during the live
 * conversation, beyond both eventually calling an LLMProvider.
 */
export const feedbackPromptBuilder = {
  build(input: FeedbackEngineInput, metrics: DeterministicMetrics): BuiltFeedbackPrompt {
    return {
      systemInstruction: buildSystemInstruction(input, metrics),
      messages: buildMessages(input.transcript),
      responseSchema: FEEDBACK_RESPONSE_JSON_SCHEMA,
    }
  },
}
