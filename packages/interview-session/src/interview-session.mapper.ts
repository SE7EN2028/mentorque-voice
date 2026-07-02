import type { FeedbackReport, TranscriptTurn } from '@mentorque/db'
import type { EngineTranscriptTurn } from '@mentorque/interview-engine'
import type { FeedbackTranscriptTurn } from '@mentorque/feedback-engine'
import type {
  FeedbackDimensionScores,
  FeedbackReportDto,
  FeedbackTopicCoverageEntry,
} from '@mentorque/shared'

/** Converts a persisted DB row into the engine's own minimal transcript
 * shape — the only point of contact between Prisma's model and the engine. */
export function toEngineTranscriptTurn(row: TranscriptTurn): EngineTranscriptTurn {
  return {
    role: row.role,
    content: row.content,
  }
}

/** Converts a persisted DB row into the Feedback Engine's richer transcript
 * shape — same source row as toEngineTranscriptTurn, but the Feedback Engine
 * additionally needs actionTaken/difficultyAtTurn to compute its metrics. */
export function toFeedbackTranscriptTurn(row: TranscriptTurn): FeedbackTranscriptTurn {
  return {
    role: row.role,
    content: row.content,
    actionTaken: row.actionTaken ?? undefined,
    difficultyAtTurn: row.difficultyAtTurn ?? undefined,
  }
}

/** Converts a persisted FeedbackReport row into the public DTO — the Json
 * columns are opaque to Prisma, so their shape is trusted here rather than
 * re-validated (they were written by this same codebase's generateFeedbackReport). */
export function toFeedbackReportDto(row: FeedbackReport): FeedbackReportDto {
  return {
    overallScore: row.overallScore,
    dimensionScores: row.dimensionScores as unknown as FeedbackDimensionScores,
    topicCoverage: row.topicCoverage as unknown as FeedbackTopicCoverageEntry[],
    difficultyReached: row.difficultyReached,
    difficultyProgression: row.difficultyProgression,
    durationMs: row.durationMs,
    summary: row.summary,
    topStrengths: row.topStrengths,
    areasForImprovement: row.areasForImprovement,
    missedOpportunities: row.missedOpportunities,
    recommendedNextSteps: row.recommendedNextSteps,
    actionablePracticeAdvice: row.actionablePracticeAdvice,
    generatedAt: row.createdAt.toISOString(),
  }
}
