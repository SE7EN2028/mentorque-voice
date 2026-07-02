import { getScoreBand, SCORE_BAND_STYLES } from './score-band'

export function OverallScoreCard({ score }: { score: number }) {
  const band = getScoreBand(score)
  const styles = SCORE_BAND_STYLES[band]

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="text-sm font-medium text-slate-400">Overall score</h2>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={`text-5xl font-semibold ${styles.text}`}>{score}</span>
        <span className="text-lg text-slate-500">/100</span>
      </div>
      <div
        className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-800"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Overall score out of 100"
      >
        <div
          className={`h-full rounded-full ${styles.fill}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  )
}
