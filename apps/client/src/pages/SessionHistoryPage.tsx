import { useMemo, useRef, useState, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type {
  FeedbackDimensionScores,
  FeedbackReportDto,
  InterviewSessionDto,
  InterviewType,
  SessionStatus,
} from '@mentorque/shared'
import { feedbackApi } from '../api/feedback'
import { FormBanner } from '../components/forms/FormBanner'
import { PageGlow } from '../components/layout/PageGlow'
import { PageHeader } from '../components/layout/PageHeader'
import { Sidebar } from '../components/layout/Sidebar'
import { SessionStatusBadge } from '../components/SessionStatusBadge'
import { INTERVIEW_TYPE_LABELS, INTERVIEW_TYPE_OPTIONS } from '../constants/interview-type'
import { useSessions } from '../hooks/useSessions'
import { useSessionScores } from '../hooks/useSessionScores'
import { durationMinutesBetween, formatDurationMinutes, formatShortDate } from '../lib/format'

const PAGE_SIZE = 8

type SortKey = 'date' | 'duration' | 'score'
type SortDir = 'asc' | 'desc'

const STATUS_FILTER_OPTIONS: { value: SessionStatus; label: string }[] = [
  { value: 'CREATED', label: 'Created' },
  { value: 'ACTIVE', label: 'In Progress' },
  { value: 'CLOSING', label: 'Finishing Up' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ABANDONED', label: 'Abandoned' },
]

// rgba backgrounds mirror the exact brand hues (violet-500, cyan-400,
// purple-500, emerald-400 all already match the design 1:1 — see index.css);
// the text tints don't have named tokens so they're arbitrary hex, same
// convention SessionStatusBadge already uses.
const TYPE_BADGE_STYLES: Record<InterviewType, string> = {
  BEHAVIORAL: 'bg-violet-500/14 text-violet-400',
  TECHNICAL: 'bg-cyan-400/14 text-[#5cd9f1]',
  SYSTEM_DESIGN: 'bg-purple-500/14 text-[#c186f5]',
  HR_CULTURE_FIT: 'bg-emerald-400/14 text-[#4ade9c]',
}

const DIMENSION_LABELS: Record<keyof FeedbackDimensionScores, string> = {
  communication: 'Communication',
  technicalKnowledge: 'Technical Knowledge',
  problemSolving: 'Problem Solving',
  confidence: 'Confidence',
  depthOfKnowledge: 'Depth of Knowledge',
  starStructure: 'STAR Structure',
}

function scoreColorClass(score: number): string {
  if (score >= 85) return 'text-emerald-400'
  if (score >= 70) return 'text-cyan-400'
  return 'text-amber-400'
}

/** Plain-text export of the key report fields — a lightweight client-side
 * download, same approach used on the Session Details page. No PDF/rich
 * formatting: this is a quick "take it with you" export, not a designed doc. */
function buildReportText(session: InterviewSessionDto, report: FeedbackReportDto): string {
  const lines: string[] = []

  lines.push('MentorQ Interview Report')
  lines.push('='.repeat(25))
  lines.push(`Interview Type: ${INTERVIEW_TYPE_LABELS[session.interviewType]}`)
  lines.push(`Date: ${formatShortDate(session.createdAt)}`)
  lines.push(
    `Duration: ${formatDurationMinutes(durationMinutesBetween(session.startedAt, session.endedAt))}`,
  )
  lines.push(`Overall Score: ${report.overallScore}/100`)
  lines.push('')

  lines.push('Dimension Scores (0-10):')
  for (const key of Object.keys(DIMENSION_LABELS) as (keyof FeedbackDimensionScores)[]) {
    const value = report.dimensionScores[key]
    lines.push(`- ${DIMENSION_LABELS[key]}: ${value === null ? '—' : value}`)
  }
  lines.push('')

  lines.push(`Difficulty Reached: ${report.difficultyReached}/5`)
  lines.push('')

  if (report.topicCoverage.length > 0) {
    lines.push('Topic Coverage:')
    for (const topic of report.topicCoverage) {
      lines.push(
        `- ${topic.topic}${topic.required ? ' (required)' : ''} — ${topic.covered ? 'Covered' : 'Not covered'}`,
      )
    }
    lines.push('')
  }

  lines.push('Summary:')
  lines.push(report.summary)
  lines.push('')

  const listSection = (title: string, items: string[]) => {
    if (items.length === 0) return
    lines.push(`${title}:`)
    for (const item of items) lines.push(`- ${item}`)
    lines.push('')
  }
  listSection('Top Strengths', report.topStrengths)
  listSection('Areas for Improvement', report.areasForImprovement)
  listSection('Missed Opportunities', report.missedOpportunities)
  listSection('Recommended Next Steps', report.recommendedNextSteps)
  listSection('Actionable Practice Advice', report.actionablePracticeAdvice)

  lines.push(`Generated: ${new Date(report.generatedAt).toLocaleString()}`)

  return lines.join('\n')
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 border-none bg-transparent p-0 font-sans text-[11.5px] font-bold tracking-[0.05em] text-[#63667a] uppercase hover:text-[#9c9fb0]"
    >
      {label}
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={active && dir === 'asc' ? 'rotate-180' : ''}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  )
}

const gradientButtonClass =
  'inline-flex items-center gap-2 rounded-[11px] bg-gradient-to-br from-violet-500 to-purple-500 px-5 py-[11px] text-[13.5px] font-bold text-white no-underline shadow-[0_8px_20px_-6px_rgba(110,86,248,0.5)] hover:brightness-[1.08]'

export function SessionHistoryPage() {
  const navigate = useNavigate()
  const { sessions, isLoading: sessionsLoading, error } = useSessions()
  const { scores, isLoading: scoresLoading } = useSessionScores(sessions)

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<InterviewType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const showToast = (message: string) => {
    setToast(message)
    clearTimeout(toastTimeout.current)
    toastTimeout.current = setTimeout(() => setToast(null), 2600)
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setPage(1)
  }

  const clearFilters = () => {
    setQuery('')
    setTypeFilter('all')
    setStatusFilter('all')
    setPage(1)
  }

  const handleDownload = async (e: MouseEvent<HTMLButtonElement>, session: InterviewSessionDto) => {
    e.preventDefault()
    e.stopPropagation()
    if (downloadingId) return
    setDownloadingId(session.id)
    try {
      const report = await feedbackApi.getReport(session.id)
      const text = buildReportText(session, report)
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `session-history-${session.id}.txt`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      showToast(
        `Report downloaded — ${INTERVIEW_TYPE_LABELS[session.interviewType]} · ${formatShortDate(session.createdAt)}`,
      )
    } catch {
      showToast('Could not download the report. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase()

    const rows = sessions
      .filter((session) => {
        const matchesQuery =
          !q || INTERVIEW_TYPE_LABELS[session.interviewType].toLowerCase().includes(q)
        const matchesType = typeFilter === 'all' || session.interviewType === typeFilter
        const matchesStatus = statusFilter === 'all' || session.status === statusFilter
        return matchesQuery && matchesType && matchesStatus
      })
      .map((session) => ({
        session,
        durationMinutes: durationMinutesBetween(session.startedAt, session.endedAt),
        score: scores[session.id] ?? null,
      }))

    rows.sort((a, b) => {
      let av: number
      let bv: number
      if (sortKey === 'date') {
        av = new Date(a.session.createdAt).getTime()
        bv = new Date(b.session.createdAt).getTime()
      } else if (sortKey === 'duration') {
        av = a.durationMinutes ?? -1
        bv = b.durationMinutes ?? -1
      } else {
        av = a.score ?? -1
        bv = b.score ?? -1
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })

    return rows
  }, [sessions, scores, query, typeFilter, statusFilter, sortKey, sortDir])

  const totalCount = filteredSorted.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const startIdx = (currentPage - 1) * PAGE_SIZE
  const pageRows = filteredSorted.slice(startIdx, startIdx + PAGE_SIZE)
  const rangeStart = totalCount === 0 ? 0 : startIdx + 1
  const rangeEnd = Math.min(totalCount, startIdx + PAGE_SIZE)

  const isLoading = sessionsLoading || scoresLoading
  const showEmptyAll = !isLoading && !error && sessions.length === 0

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />

      <main className="relative min-w-0 flex-1">
        <PageGlow />

        <PageHeader
          title="Session History"
          subtitle="Every mock interview you've completed, in one place."
        >
          <Link to="/interview/new" className={gradientButtonClass}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Interview
          </Link>
        </PageHeader>

        <div className="animate-fade-up relative z-10 px-5 pt-7 pb-15 sm:px-10">
          {error ? (
            <FormBanner variant="error" message={error} />
          ) : showEmptyAll ? (
            <div className="flex flex-col items-center gap-4 rounded-[18px] border border-hairline bg-surface px-6 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/4">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5c5f70"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15.5 14" />
                </svg>
              </div>
              <div>
                <div className="mb-1.5 text-[16px] font-semibold text-ink">
                  You haven&apos;t done any mock interviews yet
                </div>
                <div className="text-[13.5px] text-ink-dim">
                  Start your first mock interview to see it show up here.
                </div>
              </div>
              <Link to="/interview/new" className={gradientButtonClass}>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Start your first interview
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <div className="relative max-w-[320px] min-w-[220px] flex-1">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6a6d7c"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setPage(1)
                    }}
                    placeholder="Search by interview type…"
                    className="w-full rounded-[10px] border border-hairline bg-surface py-2.5 pr-3.5 pl-9.5 text-[13.5px] text-ink placeholder:text-[#63667a] focus:border-violet-500 focus:ring-[3px] focus:ring-violet-500/16 focus:outline-none"
                  />
                </div>

                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value as InterviewType | 'all')
                      setPage(1)
                    }}
                    className="cursor-pointer appearance-none rounded-[10px] border border-hairline bg-surface py-2.5 pr-9 pl-3.5 text-[13px] text-[#d5d7e0] focus:outline-none"
                  >
                    <option value="all" className="bg-surface-2 text-ink">
                      All Types
                    </option>
                    {INTERVIEW_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-surface-2 text-ink">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6a6d7c"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as SessionStatus | 'all')
                      setPage(1)
                    }}
                    className="cursor-pointer appearance-none rounded-[10px] border border-hairline bg-surface py-2.5 pr-9 pl-3.5 text-[13px] text-[#d5d7e0] focus:outline-none"
                  >
                    <option value="all" className="bg-surface-2 text-ink">
                      All Statuses
                    </option>
                    {STATUS_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-surface-2 text-ink">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6a6d7c"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              <div className="overflow-x-auto rounded-[18px] border border-hairline bg-surface">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[2.2fr_1.1fr_0.9fr_1.2fr_0.8fr_0.9fr] items-center gap-2 border-b border-hairline bg-white/[0.015] px-5.5 py-3.5">
                    <div className="text-[11.5px] font-bold tracking-[0.05em] text-[#63667a] uppercase">
                      Interview Type
                    </div>
                    <SortHeader
                      label="Date"
                      active={sortKey === 'date'}
                      dir={sortDir}
                      onClick={() => handleSort('date')}
                    />
                    <SortHeader
                      label="Duration"
                      active={sortKey === 'duration'}
                      dir={sortDir}
                      onClick={() => handleSort('duration')}
                    />
                    <div className="text-[11.5px] font-bold tracking-[0.05em] text-[#63667a] uppercase">
                      Status
                    </div>
                    <SortHeader
                      label="Score"
                      active={sortKey === 'score'}
                      dir={sortDir}
                      onClick={() => handleSort('score')}
                    />
                    <div className="text-right text-[11.5px] font-bold tracking-[0.05em] text-[#63667a] uppercase">
                      Actions
                    </div>
                  </div>

                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[2.2fr_1.1fr_0.9fr_1.2fr_0.8fr_0.9fr] items-center gap-2 border-b border-white/[0.055] px-5.5 py-4 last:border-b-0"
                      >
                        <div className="animate-skeleton-pulse h-5 w-24 rounded-full bg-white/8" />
                        <div className="animate-skeleton-pulse h-4 w-16 rounded bg-white/8" />
                        <div className="animate-skeleton-pulse h-4 w-12 rounded bg-white/8" />
                        <div className="animate-skeleton-pulse h-5 w-20 rounded-full bg-white/8" />
                        <div className="animate-skeleton-pulse h-4 w-8 rounded bg-white/8" />
                        <div className="animate-skeleton-pulse ml-auto h-6 w-16 rounded bg-white/8" />
                      </div>
                    ))
                  ) : totalCount === 0 ? (
                    <div className="flex flex-col items-center gap-3.5 px-6 py-16 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/4">
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#5c5f70"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="11" cy="11" r="7" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </div>
                      <div>
                        <div className="mb-1.5 text-[14.5px] font-semibold text-[#d5d7e0]">
                          No sessions match your filters
                        </div>
                        <div className="text-[13px] text-[#63667a]">
                          Try a different search term or clear your filters.
                        </div>
                      </div>
                      <button
                        onClick={clearFilters}
                        className="rounded-[10px] border border-white/14 bg-white/5 px-4.5 py-2.5 text-[13px] font-semibold text-ink hover:bg-white/9"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    pageRows.map(({ session, durationMinutes, score }) => {
                      const canDownload = session.status === 'COMPLETED' && score !== null
                      return (
                        <div
                          key={session.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate(`/sessions/${session.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ')
                              navigate(`/sessions/${session.id}`)
                          }}
                          className="grid cursor-pointer grid-cols-[2.2fr_1.1fr_0.9fr_1.2fr_0.8fr_0.9fr] items-center gap-2 border-b border-white/[0.055] px-5.5 py-4 last:border-b-0 hover:bg-white/[0.025]"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${TYPE_BADGE_STYLES[session.interviewType]}`}
                            >
                              {INTERVIEW_TYPE_LABELS[session.interviewType]}
                            </span>
                          </div>
                          <div className="text-[13px] text-ink-dim">
                            {formatShortDate(session.createdAt)}
                          </div>
                          <div className="text-[13px] text-ink-dim">
                            {formatDurationMinutes(durationMinutes)}
                          </div>
                          <div>
                            <SessionStatusBadge status={session.status} />
                          </div>
                          <div>
                            {score !== null ? (
                              <span
                                className={`font-display text-[14.5px] font-bold ${scoreColorClass(score)}`}
                              >
                                {score}
                              </span>
                            ) : (
                              <span className="text-[14px] text-[#4a4d5c]">—</span>
                            )}
                          </div>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                navigate(`/sessions/${session.id}`)
                              }}
                              aria-label="View session"
                              className="flex h-7.5 w-7.5 items-center justify-center rounded-[8px] bg-white/5 text-[#9c9fb0] hover:bg-white/10 hover:text-ink"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            {canDownload && (
                              <button
                                onClick={(e) => handleDownload(e, session)}
                                disabled={downloadingId === session.id}
                                aria-label="Download report"
                                className="flex h-7.5 w-7.5 items-center justify-center rounded-[8px] bg-white/5 text-[#9c9fb0] hover:bg-white/10 hover:text-ink disabled:opacity-50"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M12 3v12" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="5" y1="21" x2="19" y2="21" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {!isLoading && totalCount > 0 && (
                  <div className="flex items-center justify-between px-5.5 py-4">
                    <div className="text-[13px] text-[#63667a]">
                      Showing {rangeStart}–{rangeEnd} of {totalCount}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                        aria-label="Previous page"
                        className="flex h-7.5 w-7.5 items-center justify-center rounded-[8px] border border-hairline bg-white/4 text-[#c7c9d6] hover:bg-white/9 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={
                            n === currentPage
                              ? 'flex h-7.5 w-7.5 items-center justify-center rounded-[8px] bg-gradient-to-br from-violet-500 to-purple-500 text-[12.5px] font-bold text-white'
                              : 'flex h-7.5 w-7.5 items-center justify-center rounded-[8px] border border-hairline bg-white/4 text-[12.5px] font-semibold text-[#c7c9d6] hover:bg-white/9'
                          }
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        aria-label="Next page"
                        className="flex h-7.5 w-7.5 items-center justify-center rounded-[8px] border border-hairline bg-white/4 text-[#c7c9d6] hover:bg-white/9 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {toast && (
        <div className="animate-fade-up fixed right-7 bottom-7 z-[300] flex items-center gap-2.5 rounded-xl border border-white/12 bg-surface-2 px-5 py-3.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)]">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/16">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#34d399"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span className="text-[13.5px] font-medium text-[#f0f1f5]">{toast}</span>
        </div>
      )}
    </div>
  )
}
