import type { AnswerEvaluation } from '../types/evaluation.js'

const MIN_DIFFICULTY = 1
const MAX_DIFFICULTY = 5
const MAX_STEP_PER_TURN = 1
const STRUGGLING_SCORE_THRESHOLD = 3

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Deliberately not the model's call to make outright — "should difficulty
 * go up" is exactly the kind of soft signal an LLM answers inconsistently
 * turn to turn. The model's proposal is treated as input, not authority:
 * it's clamped to a sane step size, and a clearly weak answer vetoes any
 * increase regardless of what the model proposed.
 */
export function computeNextDifficulty(
  proposedDifficulty: number,
  currentDifficulty: number,
  latestEvaluation: AnswerEvaluation | null,
): number {
  const clampedProposal = clamp(proposedDifficulty, MIN_DIFFICULTY, MAX_DIFFICULTY)
  const delta = clamp(clampedProposal - currentDifficulty, -MAX_STEP_PER_TURN, MAX_STEP_PER_TURN)
  let next = currentDifficulty + delta

  if (latestEvaluation && next > currentDifficulty) {
    const scores = Object.values(latestEvaluation).filter(
      (value): value is number => value !== null,
    )
    const averageScore =
      scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null

    if (averageScore !== null && averageScore <= STRUGGLING_SCORE_THRESHOLD) {
      next = currentDifficulty
    }
  }

  return clamp(next, MIN_DIFFICULTY, MAX_DIFFICULTY)
}
