import { useId, useState } from 'react'

const VIEW_WIDTH = 400
const VIEW_HEIGHT = 140
const PLOT_LEFT = 8
const PLOT_RIGHT = 392
const PLOT_TOP = 14
const PLOT_BOTTOM = 108
const MIN_DIFFICULTY = 1
const MAX_DIFFICULTY = 5

function xForIndex(index: number, count: number): number {
  if (count <= 1) return (PLOT_LEFT + PLOT_RIGHT) / 2
  return PLOT_LEFT + (index / (count - 1)) * (PLOT_RIGHT - PLOT_LEFT)
}

function yForDifficulty(difficulty: number): number {
  const ratio = (difficulty - MIN_DIFFICULTY) / (MAX_DIFFICULTY - MIN_DIFFICULTY)
  return PLOT_BOTTOM - ratio * (PLOT_BOTTOM - PLOT_TOP)
}

/** Easy/Medium/Hard read more naturally than a raw 1-5 scale here, and match
 * the approved mockup's y-axis treatment. */
function bandColorForDifficulty(difficulty: number): string {
  if (difficulty <= 2) return '#4ade9c'
  if (difficulty === 3) return '#fbbf24'
  return '#fb7185'
}

export function DifficultyProgressionChart({ progression }: { progression: number[] }) {
  const gradientId = useId()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (progression.length === 0) {
    return (
      <div className="rounded-2xl border border-hairline bg-surface p-6">
        <h2 className="font-display text-[15.5px] font-semibold text-ink">
          Difficulty Progression
        </h2>
        <p className="mt-3 text-sm text-ink-dim">No question data available.</p>
      </div>
    )
  }

  const points = progression.map((difficulty, index) => ({
    index,
    difficulty,
    x: xForIndex(index, progression.length),
    y: yForDifficulty(difficulty),
  }))
  const linePath = points.map((p) => `${p.x},${p.y}`).join(' ')
  const hovered = hoveredIndex !== null ? points[hoveredIndex] : undefined
  const lastPoint = points[points.length - 1]

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <h2 className="font-display text-[15.5px] font-semibold text-ink">Difficulty Progression</h2>
      <p className="mt-1 mb-3.5 text-[12.5px] text-ink-dim/80">
        How question difficulty shifted across the session
      </p>

      <div className="flex gap-3.5">
        <div className="flex shrink-0 flex-col justify-between py-1.5 pb-6.5">
          <span className="text-[11px] text-[#fb7185]">Hard</span>
          <span className="text-[11px] text-[#fbbf24]">Medium</span>
          <span className="text-[11px] text-[#4ade9c]">Easy</span>
        </div>

        <div className="relative flex-1">
          <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="w-full"
            role="img"
            aria-label={`Difficulty over ${progression.length} questions, ending at ${lastPoint?.difficulty ?? '—'} out of 5`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6e56f8" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>

            {[MIN_DIFFICULTY, 3, MAX_DIFFICULTY].map((tick) => (
              <line
                key={tick}
                x1={PLOT_LEFT}
                x2={PLOT_RIGHT}
                y1={yForDifficulty(tick)}
                y2={yForDifficulty(tick)}
                stroke="rgba(255,255,255,0.06)"
              />
            ))}

            {hovered && (
              <line
                x1={hovered.x}
                x2={hovered.x}
                y1={PLOT_TOP}
                y2={PLOT_BOTTOM}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth={1}
              />
            )}

            <polyline
              points={linePath}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map((p) => (
              <g key={p.index}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hoveredIndex === p.index ? 7 : 5.5}
                  fill="#12131a"
                  stroke={bandColorForDifficulty(p.difficulty)}
                  strokeWidth={2.5}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={11}
                  fill="transparent"
                  tabIndex={0}
                  className="cursor-pointer focus:outline-none"
                  aria-label={`Question ${p.index + 1}: difficulty ${p.difficulty} out of 5`}
                  onMouseEnter={() => setHoveredIndex(p.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(p.index)}
                  onBlur={() => setHoveredIndex(null)}
                />
                <text x={p.x} y={PLOT_BOTTOM + 20} fill="#63667a" fontSize={11} textAnchor="middle">
                  {`Q${p.index + 1}`}
                </text>
              </g>
            ))}
          </svg>

          {hovered && (
            <div
              className="pointer-events-none absolute rounded-lg border border-hairline bg-surface-2 px-2.5 py-1.5 text-xs shadow-lg"
              style={{
                left: `${(hovered.x / VIEW_WIDTH) * 100}%`,
                top: `${(hovered.y / VIEW_HEIGHT) * 100}%`,
                transform: 'translate(-50%, -140%)',
              }}
            >
              <div className="font-semibold text-ink">Difficulty {hovered.difficulty}/5</div>
              <div className="text-ink-dim">Question {hovered.index + 1}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
