import type { FeedbackDimensionScores } from '@mentorque/shared'
import {
  FEEDBACK_DIMENSION_LABELS,
  FEEDBACK_DIMENSION_ORDER,
} from '../../constants/feedback-dimension'

export function DimensionScoreBars({ scores }: { scores: FeedbackDimensionScores }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-sm font-medium text-slate-400">Score breakdown</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {FEEDBACK_DIMENSION_ORDER.map((dimension) => {
          const score = scores[dimension]
          const label = FEEDBACK_DIMENSION_LABELS[dimension]
          return (
            <li
              key={dimension}
              tabIndex={0}
              className="flex items-center gap-3 rounded px-1 py-0.5 focus:bg-slate-800/50 focus:outline-none"
              aria-label={
                score === null ? `${label}: not assessed` : `${label}: ${score} out of 10`
              }
            >
              <span className="w-40 shrink-0 text-sm text-slate-300">{label}</span>
              <span className="h-2.5 flex-1 rounded-sm bg-slate-800" aria-hidden="true">
                {score !== null && (
                  <span
                    className="block h-full rounded-sm bg-indigo-400"
                    style={{
                      width: `${(score / 10) * 100}%`,
                      borderTopRightRadius: '4px',
                      borderBottomRightRadius: '4px',
                    }}
                  />
                )}
              </span>
              <span
                className="w-24 shrink-0 text-right text-sm whitespace-nowrap text-slate-400"
                aria-hidden="true"
              >
                {score === null ? 'Not assessed' : `${score}/10`}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
