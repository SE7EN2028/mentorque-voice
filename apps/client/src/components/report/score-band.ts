export type ScoreBand = 'good' | 'warning' | 'critical'

/** Thresholds chosen to match this app's existing status vocabulary
 * (SessionStatusBadge's emerald=good/amber=in-between/red=bad), so a score
 * band reads consistently with the rest of the product. */
export function getScoreBand(scoreOutOf100: number): ScoreBand {
  if (scoreOutOf100 >= 75) return 'good'
  if (scoreOutOf100 >= 50) return 'warning'
  return 'critical'
}

export const SCORE_BAND_STYLES: Record<ScoreBand, { text: string; fill: string }> = {
  good: { text: 'text-emerald-300', fill: 'bg-emerald-400' },
  warning: { text: 'text-amber-300', fill: 'bg-amber-400' },
  critical: { text: 'text-red-300', fill: 'bg-red-400' },
}

/** Short verdict copy shown next to a score-band badge (e.g. the score-reveal
 * screen after an interview finishes). */
export const SCORE_BAND_LABELS: Record<ScoreBand, string> = {
  good: 'Strong Performance',
  warning: 'Solid Effort',
  critical: 'Needs Practice',
}
