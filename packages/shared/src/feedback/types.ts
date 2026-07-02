/**
 * The canonical feedback report shape — defined once here and reused
 * as-is by packages/feedback-engine (its function return type), the
 * GET /api/sessions/:id/report response, and the frontend Report page.
 * No separate "internal" vs "wire" type: nothing here is Prisma- or
 * Express-specific, so there's nothing to adapt away.
 */
export interface FeedbackDimensionScores {
  communication: number | null
  technicalKnowledge: number | null
  problemSolving: number | null
  confidence: number | null
  depthOfKnowledge: number | null
  starStructure: number | null
}

export interface FeedbackTopicCoverageEntry {
  topic: string
  required: boolean
  covered: boolean
}

export interface FeedbackReportDto {
  /** 0-100, deterministic — see packages/feedback-engine's deterministic-metrics.ts. */
  overallScore: number
  /** 0-10 per dimension, deterministic (averaged from per-turn evaluations). */
  dimensionScores: FeedbackDimensionScores
  topicCoverage: FeedbackTopicCoverageEntry[]
  /** 1-5, deterministic (max difficulty reached across the interview). */
  difficultyReached: number
  /** Difficulty at each interviewer turn, in order — powers the progression chart. */
  difficultyProgression: number[]
  durationMs: number
  /** Everything below this line is LLM-written, grounded in the deterministic
   * numbers above via the report prompt — never re-deriving the scores itself. */
  summary: string
  topStrengths: string[]
  areasForImprovement: string[]
  missedOpportunities: string[]
  recommendedNextSteps: string[]
  actionablePracticeAdvice: string[]
  generatedAt: string
}
