import type { FeedbackDimensionScores } from '@mentorque/shared'
import {
  FEEDBACK_DIMENSION_LABELS,
  FEEDBACK_DIMENSION_ORDER,
} from '../../constants/feedback-dimension'

/** Per-dimension gradient, echoing the brand violet/purple pairing used
 * elsewhere while giving each bar its own identity (mirrors the mockup's
 * per-row color coding). */
const DIMENSION_BAR_GRADIENT: Record<keyof FeedbackDimensionScores, string> = {
  communication: 'from-violet-500 to-purple-500',
  technicalKnowledge: 'from-cyan-400 to-[#38bdf8]',
  problemSolving: 'from-[#fbbf24] to-[#f59e0b]',
  confidence: 'from-[#f472b6] to-[#ec4899]',
  depthOfKnowledge: 'from-[#818cf8] to-[#6366f1]',
  starStructure: 'from-[#34d399] to-[#4ade9c]',
}

export function DimensionScoreBars({ scores }: { scores: FeedbackDimensionScores }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <h2 className="font-display text-[15.5px] font-semibold text-ink">Performance Analysis</h2>
      <ul className="mt-5 flex flex-col gap-4">
        {FEEDBACK_DIMENSION_ORDER.map((dimension, index) => {
          const score = scores[dimension]
          const label = FEEDBACK_DIMENSION_LABELS[dimension]
          return (
            <li
              key={dimension}
              tabIndex={0}
              className="rounded px-1 py-0.5 focus:bg-white/5 focus:outline-none"
              aria-label={
                score === null ? `${label}: not assessed` : `${label}: ${score} out of 10`
              }
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13.5px] font-semibold text-[#d5d7e0]">{label}</span>
                <span className="font-display text-[13.5px] font-bold text-ink">
                  {score === null ? 'Not assessed' : `${score}/10`}
                </span>
              </div>
              <div className="h-[7px] overflow-hidden rounded-full bg-white/7" aria-hidden="true">
                {score !== null && (
                  <div
                    className={`h-full origin-left animate-bar-grow rounded-full bg-gradient-to-r ${DIMENSION_BAR_GRADIENT[dimension]}`}
                    style={{ width: `${(score / 10) * 100}%`, animationDelay: `${index * 0.06}s` }}
                  />
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
