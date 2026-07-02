import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { InterviewType } from '@mentorque/shared'
import { FormBanner } from '../components/forms/FormBanner'
import { PageGlow } from '../components/layout/PageGlow'
import { PageHeader } from '../components/layout/PageHeader'
import { Sidebar } from '../components/layout/Sidebar'
import { INTERVIEW_TYPE_LABELS, INTERVIEW_TYPE_OPTIONS } from '../constants/interview-type'
import { useAuth } from '../context/AuthContext'
import { useDismissOnEscapeOrOutside } from '../hooks/useDismissOnEscapeOrOutside'
import { useSessions } from '../hooks/useSessions'
import { useSessionScores, type SessionScoreMap } from '../hooks/useSessionScores'
import { durationMinutesBetween, formatDurationMinutes, formatShortDate } from '../lib/format'

/** Per-interview-type visual identity — icon + tint, reused across the stats
 * grid, the recent sessions list, and the recommendations panel so the same
 * type always reads the same way. */
const TYPE_VISUALS: Record<InterviewType, { bg: string; stroke: string; icon: ReactNode }> = {
  TECHNICAL: {
    bg: 'rgba(34,211,238,0.14)',
    stroke: '#5CD9F1',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  BEHAVIORAL: {
    bg: 'rgba(110,86,248,0.14)',
    stroke: '#9E8CFB',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.9 8.9 0 0 1-3.6-.8L3 20l1-4.5a8.4 8.4 0 0 1-1-4A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
      </svg>
    ),
  },
  SYSTEM_DESIGN: {
    bg: 'rgba(168,85,247,0.14)',
    stroke: '#C186F5',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
  HR_CULTURE_FIT: {
    bg: 'rgba(52,211,153,0.14)',
    stroke: '#4ADE9C',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="7" r="4" />
        <path d="M2.5 21c0-4 3-6.5 6.5-6.5s6.5 2.5 6.5 6.5" />
        <circle cx="17.5" cy="8" r="3" />
      </svg>
    ),
  },
}

function scoreColor(score: number): string {
  if (score >= 80) return '#34D399'
  if (score >= 60) return '#22D3EE'
  return '#FBBF24'
}

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatHoursLabel(totalMinutes: number): string {
  const hours = Math.round((totalMinutes / 60) * 10) / 10
  return `${Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1)}h`
}

function nonNullScores(scores: SessionScoreMap): number[] {
  return Object.values(scores).filter((v): v is number => v !== null && v !== undefined)
}

interface TrendPoint {
  id: string
  date: string
  score: number
}

/** Single-series trend line — per the dataviz skill: one hue (no legend box
 * needed for a single series), 2-3px line, >=8px end marker, hover crosshair
 * + tooltip with a >=24px hit target, and a direct end-label rather than a
 * value stamped on every point. */
function PerformanceTrendChart({ points }: { points: TrendPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (points.length === 0) return null

  const width = 560
  const viewBoxHeight = 190
  const renderedHeight = 210
  const top = 16
  const bottom = 160
  const plotHeight = bottom - top

  const coords = points.map((p, i) => ({
    ...p,
    x: points.length === 1 ? width / 2 : (i / (points.length - 1)) * width,
    y: bottom - (p.score / 100) * plotHeight,
  }))

  const last = coords[coords.length - 1]
  if (!last) return null
  const hovered = hoverIndex !== null ? (coords[hoverIndex] ?? null) : null

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
  const areaPath = `${linePath} L${last.x},${bottom} L${coords[0]?.x ?? 0},${bottom} Z`

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${viewBoxHeight}`}
        preserveAspectRatio="none"
        className="block h-[210px] w-full overflow-visible"
      >
        <defs>
          <linearGradient id="dashboardTrendLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6E56F8" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <linearGradient id="dashboardTrendArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6E56F8" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#6E56F8" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line x1="0" y1={top} x2={width} y2={top} stroke="rgba(255,255,255,0.06)" />
        <line
          x1="0"
          y1={(top + bottom) / 2}
          x2={width}
          y2={(top + bottom) / 2}
          stroke="rgba(255,255,255,0.06)"
        />
        <line x1="0" y1={bottom} x2={width} y2={bottom} stroke="rgba(255,255,255,0.06)" />

        <path d={areaPath} fill="url(#dashboardTrendArea)" />
        <path
          d={linePath}
          fill="none"
          stroke="url(#dashboardTrendLine)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hovered && (
          <line
            x1={hovered.x}
            y1={top}
            x2={hovered.x}
            y2={bottom}
            stroke="rgba(255,255,255,0.16)"
          />
        )}

        {coords.map((c, i) => (
          <g key={c.id}>
            {/* Hit target sized to the skill's >=24px minimum, not the visible dot. */}
            <circle
              cx={c.x}
              cy={c.y}
              r="12"
              fill="transparent"
              className="cursor-pointer"
              tabIndex={0}
              role="img"
              aria-label={`${formatShortDate(c.date)}: score ${c.score} out of 100`}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex((v) => (v === i ? null : v))}
              onFocus={() => setHoverIndex(i)}
              onBlur={() => setHoverIndex((v) => (v === i ? null : v))}
            />
            {(i === coords.length - 1 || hoverIndex === i) && (
              <circle
                cx={c.x}
                cy={c.y}
                r="5.5"
                fill="#12131A"
                stroke="#22D3EE"
                strokeWidth="2.5"
                pointerEvents="none"
              />
            )}
          </g>
        ))}
      </svg>

      {hoverIndex === null && (
        <div
          className="pointer-events-none absolute font-display text-[13px] font-bold text-ink"
          style={{
            left: `${(last.x / width) * 100}%`,
            top: `${(last.y / viewBoxHeight) * renderedHeight}px`,
            transform: 'translate(10px, -125%)',
          }}
        >
          {last.score}
        </div>
      )}

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] rounded-[10px] border border-white/10 bg-surface-2 px-3 py-2 text-center whitespace-nowrap shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]"
          style={{
            left: `${(hovered.x / width) * 100}%`,
            top: `${(hovered.y / viewBoxHeight) * renderedHeight}px`,
          }}
        >
          <div className="font-display text-[13px] font-bold text-ink">{hovered.score}/100</div>
          <div className="text-[11px] text-ink-dim">{formatShortDate(hovered.date)}</div>
        </div>
      )}

      <div className="mt-1 flex justify-between px-0.5">
        {coords.map((c) => (
          <span key={c.id} className="text-[11px] text-[#565A6B]">
            {new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ))}
      </div>
    </div>
  )
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useDismissOnEscapeOrOutside(open, containerRef, () => setOpen(false))

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-white/8 bg-white/[0.03] text-[#C7C9D6] hover:bg-white/7"
        aria-label={open ? 'Hide notifications' : 'Show notifications'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
          <path d="M9.5 20a2.5 2.5 0 0 0 5 0" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-12 right-0 z-50 w-80 rounded-[14px] border border-white/10 bg-surface-2 p-2 shadow-[0_24px_55px_-12px_rgba(0,0,0,0.65)]">
          <div className="px-2.5 pt-2 pb-2.5 text-[13.5px] font-bold text-ink">Notifications</div>
          <div className="flex flex-col items-center gap-2.5 px-4 py-8 text-center">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#565A6B"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
              <path d="M9.5 20a2.5 2.5 0 0 0 5 0" />
            </svg>
            <p className="text-[13px] text-ink-dim">No notifications yet</p>
          </div>
        </div>
      )}
    </div>
  )
}

function StatSkeletons() {
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-5 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[132px] animate-skeleton-pulse rounded-[18px] bg-white/5" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="h-[420px] animate-skeleton-pulse rounded-[20px] bg-white/4" />
        <div className="h-[420px] animate-skeleton-pulse rounded-[20px] bg-white/4" />
      </div>
    </>
  )
}

function EmptyDashboardState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[20px] border border-hairline bg-surface px-10 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-violet-500/14">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9E8CFB"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="2" width="6" height="11" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </div>
      <div>
        <div className="font-display text-[18px] font-semibold text-ink">No interviews yet</div>
        <p className="mt-1.5 max-w-sm text-[13.5px] text-ink-dim">
          Start your first practice session to see your stats, trend, and personalized
          recommendations here.
        </p>
      </div>
      <Link
        to="/interview/new"
        className="mt-1 inline-flex items-center gap-2 rounded-[11px] bg-violet-500 px-5 py-3 text-[14px] font-bold text-white no-underline hover:bg-violet-600"
      >
        Start your first interview
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { sessions, isLoading: sessionsLoading, error, deleteSession } = useSessions()
  const { scores, isLoading: scoresLoading } = useSessionScores(sessions)

  const isLoading = sessionsLoading || scoresLoading

  const firstName = user?.name.trim().split(/\s+/)[0] ?? ''
  const greeting = `${greetingForHour(new Date().getHours())}, ${firstName}`

  const completedSessions = useMemo(
    () => sessions.filter((s) => s.status === 'COMPLETED'),
    [sessions],
  )

  const scoreValues = useMemo(() => nonNullScores(scores), [scores])

  const averageScore =
    scoreValues.length > 0
      ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
      : null

  const bestScore = scoreValues.length > 0 ? Math.max(...scoreValues) : null
  const bestScoreSession =
    bestScore !== null ? sessions.find((s) => scores[s.id] === bestScore) : undefined

  const totalPracticeMinutes = useMemo(
    () =>
      sessions.reduce((sum, s) => {
        const minutes = durationMinutesBetween(s.startedAt, s.endedAt)
        return minutes !== null ? sum + minutes : sum
      }, 0),
    [sessions],
  )

  const trendPoints = useMemo<TrendPoint[]>(() => {
    return completedSessions
      .map((s) => ({ id: s.id, date: s.createdAt, score: scores[s.id] }))
      .filter((p): p is TrendPoint => p.score !== null && p.score !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-8)
  }, [completedSessions, scores])

  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4)
  }, [sessions])

  const recommendations = useMemo(() => {
    const zeroAttempt: InterviewType[] = []
    const avgByType: Partial<Record<InterviewType, number>> = {}

    for (const option of INTERVIEW_TYPE_OPTIONS) {
      const sessionsOfType = sessions.filter((s) => s.interviewType === option.value)
      if (sessionsOfType.length === 0) {
        zeroAttempt.push(option.value)
        continue
      }
      const typeScores = sessionsOfType
        .map((s) => scores[s.id])
        .filter((v): v is number => v !== null && v !== undefined)
      if (typeScores.length > 0) {
        avgByType[option.value] = typeScores.reduce((a, b) => a + b, 0) / typeScores.length
      }
    }

    const items: { type: InterviewType; title: string; body: string }[] = []

    for (const type of zeroAttempt) {
      items.push({
        type,
        title: `Try ${INTERVIEW_TYPE_LABELS[type]}`,
        body: `You haven't tried a ${INTERVIEW_TYPE_LABELS[type]} interview yet.`,
      })
    }

    const scoredEntries = Object.entries(avgByType) as [InterviewType, number][]
    if (scoredEntries.length > 0) {
      const [lowestType, lowestAvg] = scoredEntries.reduce((min, entry) =>
        entry[1] < min[1] ? entry : min,
      )
      items.push({
        type: lowestType,
        title: `Retry ${INTERVIEW_TYPE_LABELS[lowestType]}`,
        body: `Your average ${INTERVIEW_TYPE_LABELS[lowestType]} score is ${Math.round(lowestAvg)} — the lowest of your attempted types.`,
      })
    }

    return items.slice(0, 3)
  }, [sessions, scores])

  function handleDelete(id: string) {
    if (window.confirm('Delete this session? This cannot be undone.')) {
      void deleteSession(id)
    }
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <main className="relative min-w-0 flex-1">
        <PageGlow />
        <PageHeader title={greeting} subtitle="Ready for your next practice session?">
          <NotificationBell />
        </PageHeader>

        <div className="relative z-10 px-5 pt-8 pb-15 sm:px-10">
          {error && (
            <div className="mb-6">
              <FormBanner variant="error" message={error} />
            </div>
          )}

          {isLoading && <StatSkeletons />}

          {!isLoading && sessions.length === 0 && <EmptyDashboardState />}

          {!isLoading && sessions.length > 0 && (
            <div className="animate-fade-up">
              {/* Stats grid */}
              <div className="mb-6 grid grid-cols-2 gap-5 md:grid-cols-4">
                <div className="rounded-[18px] border border-hairline bg-surface p-[22px]">
                  <div className="mb-[22px] flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-violet-500/14">
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#9E8CFB"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="17" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <path d="M8 14.5l2 2 4.5-4.5" />
                    </svg>
                  </div>
                  <div className="font-display text-[32px] leading-none font-bold text-[#F9F9FC]">
                    {completedSessions.length}
                  </div>
                  <div className="mt-2 text-[13px] text-[#8B8EA0]">Interviews Completed</div>
                </div>

                <div className="rounded-[18px] border border-hairline bg-surface p-[22px]">
                  <div className="mb-[22px] flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-cyan-400/14">
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#5CD9F1"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="4" y1="20" x2="4" y2="11" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="20" y1="20" x2="20" y2="15" />
                    </svg>
                  </div>
                  <div className="font-display text-[32px] leading-none font-bold text-[#F9F9FC]">
                    {averageScore !== null ? (
                      <>
                        {averageScore}
                        <span className="text-[16px] font-semibold text-[#63667A]">/100</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                  <div className="mt-2 text-[13px] text-[#8B8EA0]">Average Score</div>
                </div>

                <div className="rounded-[18px] border border-hairline bg-surface p-[22px]">
                  <div className="mb-[22px] flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-amber-400/14">
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#FBBF24"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8-5.1-4.7 6.9-.8z" />
                    </svg>
                  </div>
                  <div className="font-display text-[32px] leading-none font-bold text-[#F9F9FC]">
                    {bestScore !== null ? (
                      <>
                        {bestScore}
                        <span className="text-[16px] font-semibold text-[#63667A]">/100</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                  <div className="mt-2 text-[13px] text-[#8B8EA0]">
                    {bestScoreSession
                      ? `Best Score · ${INTERVIEW_TYPE_LABELS[bestScoreSession.interviewType]}`
                      : 'Best Score'}
                  </div>
                </div>

                <div className="rounded-[18px] border border-hairline bg-surface p-[22px]">
                  <div className="mb-[22px] flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-emerald-400/14">
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#4ADE9C"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <polyline points="12 7 12 12 15.5 14" />
                    </svg>
                  </div>
                  <div className="font-display text-[32px] leading-none font-bold text-[#F9F9FC]">
                    {formatHoursLabel(totalPracticeMinutes)}
                  </div>
                  <div className="mt-2 text-[13px] text-[#8B8EA0]">Total Practice Time</div>
                </div>
              </div>

              {/* Two-column layout */}
              <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
                <div className="flex min-w-0 flex-col gap-6">
                  <div className="rounded-[20px] border border-hairline bg-surface p-[26px]">
                    <div className="mb-1.5 font-display text-[16.5px] font-semibold text-ink">
                      Performance Trend
                    </div>
                    {trendPoints.length >= 2 ? (
                      <>
                        <div className="mb-2.5 text-[12.5px] text-[#63667A]">
                          Last {trendPoints.length} completed session
                          {trendPoints.length === 1 ? '' : 's'}
                        </div>
                        <PerformanceTrendChart points={trendPoints} />
                      </>
                    ) : (
                      <div className="flex h-[210px] flex-col items-center justify-center gap-2 text-center">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#565A6B"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="4" y1="20" x2="4" y2="11" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="20" y1="20" x2="20" y2="15" />
                        </svg>
                        <p className="text-[13px] text-ink-dim">
                          Complete a few interviews to see your trend
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[20px] border border-hairline bg-surface p-[26px]">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="font-display text-[16.5px] font-semibold text-ink">
                        Recent Sessions
                      </div>
                      <Link
                        to="/sessions"
                        className="text-[13px] font-semibold text-violet-400 no-underline hover:text-violet-400/80"
                      >
                        View all
                      </Link>
                    </div>

                    {recentSessions.map((session, i) => {
                      const visuals = TYPE_VISUALS[session.interviewType]
                      const score = scores[session.id]
                      const duration = durationMinutesBetween(session.startedAt, session.endedAt)
                      return (
                        <div
                          key={session.id}
                          className={`group flex items-center justify-between py-3.5 ${
                            i < recentSessions.length - 1 ? 'border-b border-hairline' : ''
                          }`}
                        >
                          <Link
                            to={`/sessions/${session.id}`}
                            className="flex min-w-0 flex-1 items-center gap-3.5 no-underline"
                          >
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]"
                              style={{ background: visuals.bg, color: visuals.stroke }}
                            >
                              {visuals.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[14.5px] font-semibold text-ink">
                                {INTERVIEW_TYPE_LABELS[session.interviewType]}
                              </div>
                              <div className="mt-0.5 text-[12.5px] text-[#75788A]">
                                {formatShortDate(session.createdAt)}
                                {duration !== null ? ` · ${formatDurationMinutes(duration)}` : ''}
                              </div>
                            </div>
                          </Link>
                          <div className="flex shrink-0 items-center gap-3.5">
                            {score !== null && score !== undefined ? (
                              <span
                                className="font-display text-[15px] font-bold"
                                style={{ color: scoreColor(score) }}
                              >
                                {score}
                              </span>
                            ) : (
                              <span className="font-display text-[15px] font-bold text-[#4A4D5C]">
                                —
                              </span>
                            )}
                            <button
                              onClick={() => handleDelete(session.id)}
                              aria-label="Delete session"
                              className="opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#FB7185"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-6">
                  <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-violet-500 to-purple-500 p-7 shadow-[0_20px_50px_-16px_rgba(110,86,248,0.5)]">
                    <div className="absolute -top-10 -right-10 h-[150px] w-[150px] rounded-full bg-white/12" />
                    <div className="relative">
                      <div className="mb-4.5 flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-white/18">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="9" y="2" width="6" height="11" rx="3" />
                          <path d="M5 10a7 7 0 0 0 14 0" />
                          <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                      </div>
                      <div className="mb-2 font-display text-[19px] font-bold text-white">
                        Ready for your next round?
                      </div>
                      <p className="mb-5 text-[13.5px] leading-[1.55] text-white/82">
                        Configure a new session tailored to your role, resume, and goals.
                      </p>
                      <Link
                        to="/interview/new"
                        className="inline-flex items-center gap-2 rounded-[11px] bg-white px-5 py-3 text-[14px] font-bold text-violet-500 no-underline hover:bg-[#F3F0FF]"
                      >
                        Start New Interview
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#6E56F8"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-hairline bg-surface p-[22px]">
                    <div className="mb-4 font-display text-[16px] font-semibold text-ink">
                      Recommendations
                    </div>
                    {recommendations.length > 0 ? (
                      recommendations.map((rec, i) => {
                        const visuals = TYPE_VISUALS[rec.type]
                        return (
                          <div
                            key={`${rec.type}-${rec.title}`}
                            className={`flex gap-3 rounded-[14px] bg-white/[0.02] p-[13px] ${
                              i < recommendations.length - 1 ? 'mb-2.5' : ''
                            }`}
                          >
                            <div
                              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px]"
                              style={{ background: visuals.bg, color: visuals.stroke }}
                            >
                              {visuals.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="mb-0.5 text-[13.5px] font-semibold text-ink">
                                {rec.title}
                              </div>
                              <div className="mb-2 text-[12px] leading-[1.5] text-[#75788A]">
                                {rec.body}
                              </div>
                              <Link
                                to="/interview/new"
                                className="text-[12px] font-bold text-violet-400 no-underline hover:text-violet-400/80"
                              >
                                Start session →
                              </Link>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-[13px] text-ink-dim">
                        Complete an interview to get personalized recommendations.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
