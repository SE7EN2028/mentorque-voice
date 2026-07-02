import { useState } from 'react'

const VIEW_WIDTH = 400
const VIEW_HEIGHT = 140
const PLOT_LEFT = 28
const PLOT_RIGHT = 372
const PLOT_TOP = 12
const PLOT_BOTTOM = 120
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

export function DifficultyProgressionChart({ progression }: { progression: number[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (progression.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-sm font-medium text-slate-400">Difficulty progression</h2>
        <p className="mt-4 text-sm text-slate-500">No question data available.</p>
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
    <div className="relative rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-sm font-medium text-slate-400">Difficulty progression</h2>
      <p className="text-xs text-slate-500">Question order &rarr;</p>

      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`Difficulty over ${progression.length} questions, ending at ${lastPoint?.difficulty ?? '—'} out of 5`}
      >
        {[1, 2, 3, 4, 5].map((tick) => (
          <g key={tick}>
            <line
              x1={PLOT_LEFT}
              x2={PLOT_RIGHT}
              y1={yForDifficulty(tick)}
              y2={yForDifficulty(tick)}
              stroke="#1e293b"
              strokeWidth={1}
            />
            <text
              x={PLOT_LEFT - 6}
              y={yForDifficulty(tick) + 3}
              textAnchor="end"
              fontSize={9}
              fill="#64748b"
            >
              {tick}
            </text>
          </g>
        ))}

        {hovered && (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={PLOT_TOP}
            y2={PLOT_BOTTOM}
            stroke="#475569"
            strokeWidth={1}
          />
        )}

        <polyline
          points={linePath}
          fill="none"
          stroke="#818cf8"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {lastPoint && (
          <text
            x={lastPoint.x + 8}
            y={lastPoint.y + 3}
            fontSize={11}
            fill="#a5b4fc"
            fontWeight={600}
          >
            {lastPoint.difficulty}
          </text>
        )}

        {points.map((p) => (
          <g key={p.index}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === p.index ? 5.5 : 4}
              fill="#818cf8"
              stroke="#0f172a"
              strokeWidth={2}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={10}
              fill="transparent"
              tabIndex={0}
              className="cursor-pointer focus:outline-none"
              aria-label={`Question ${p.index + 1}: difficulty ${p.difficulty} out of 5`}
              onMouseEnter={() => setHoveredIndex(p.index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onFocus={() => setHoveredIndex(p.index)}
              onBlur={() => setHoveredIndex(null)}
            />
          </g>
        ))}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs shadow-lg"
          style={{
            left: `${(hovered.x / VIEW_WIDTH) * 100}%`,
            top: `${(hovered.y / VIEW_HEIGHT) * 100}%`,
            transform: 'translate(-50%, -130%)',
          }}
        >
          <div className="font-semibold text-slate-100">Difficulty {hovered.difficulty}/5</div>
          <div className="text-slate-400">Question {hovered.index + 1}</div>
        </div>
      )}
    </div>
  )
}
