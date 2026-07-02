import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type {
  FeedbackReportDto,
  FeedbackTopicCoverageEntry,
  InterviewSessionDto,
} from '@mentorque/shared'
import { ApiError } from '../api/client'
import { sessionsApi } from '../api/sessions'
import { FormBanner } from '../components/forms/FormBanner'
import { FullScreenSpinner } from '../components/FullScreenSpinner'
import { PageGlow } from '../components/layout/PageGlow'
import { Sidebar } from '../components/layout/Sidebar'
import { DifficultyProgressionChart } from '../components/report/DifficultyProgressionChart'
import { DimensionScoreBars } from '../components/report/DimensionScoreBars'
import { getScoreBand, SCORE_BAND_STYLES } from '../components/report/score-band'
import { TopicCoverageList } from '../components/report/TopicCoverageList'
import { SessionStatusBadge } from '../components/SessionStatusBadge'
import {
  FEEDBACK_DIMENSION_LABELS,
  FEEDBACK_DIMENSION_ORDER,
} from '../constants/feedback-dimension'
import { INTERVIEW_TYPE_LABELS } from '../constants/interview-type'
import { useAuth } from '../context/AuthContext'
import { useFeedbackReport } from '../hooks/useFeedbackReport'
import { useSession } from '../hooks/useSession'
import {
  durationMinutesBetween,
  formatDurationMinutes,
  formatDurationMs,
  formatShortDate,
} from '../lib/format'

// A single topic-progression row reads cleanly as a connected-dot stepper up
// to about six entries (same spirit as the approved mockup's fixed 5-step
// example); past that it wraps awkwardly, so we fall back to the vertical
// TopicCoverageList instead of cramming dots into multiple misaligned rows.
const STEPPER_MAX_TOPICS = 6

export function SessionDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { session, isLoading, error, update } = useSession(id ?? '')
  // Only poll for a report once the session is actually completed — avoids
  // hammering the endpoint (and the 409-triggered retry loop) for sessions
  // that will never have one.
  const reportState = useFeedbackReport(session?.status === 'COMPLETED' ? session.id : '')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [])

  if (isLoading) {
    return <FullScreenSpinner />
  }

  if (error || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <FormBanner variant="error" message={error ?? 'Session not found'} />
      </main>
    )
  }

  const isCompleted = session.status === 'COMPLETED'
  const isCompletedWithReport = isCompleted && reportState.status === 'ready'

  const durationMinutes = durationMinutesBetween(session.startedAt, session.endedAt)
  const subtitle = [
    user?.jobRole,
    formatShortDate(session.createdAt),
    durationMinutes !== null ? formatDurationMinutes(durationMinutes) : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ')

  const handleAbandon = async () => {
    setActionError(null)
    try {
      await update({ status: 'ABANDONED' })
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update session.')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this session? This cannot be undone.')) return
    setIsDeleting(true)
    try {
      await sessionsApi.remove(session.id)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not delete session.')
      setIsDeleting(false)
    }
  }

  const handleDownloadReport = () => {
    if (reportState.status !== 'ready') return
    const text = buildReportText(session, reportState.report, user?.jobRole)
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mentorque-session-${session.id}-report.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setShowToast(true)
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => setShowToast(false), 2600)
  }

  return (
    <div className="flex min-h-screen bg-canvas font-sans text-ink">
      <Sidebar />

      <main className="relative min-w-0 flex-1">
        <PageGlow />

        <div className="relative z-10 mx-auto max-w-[880px] animate-fade-up px-5 pt-9 pb-[70px] sm:px-10">
          <Link
            to="/sessions"
            className="mb-5.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-dim no-underline hover:text-ink"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Session History
          </Link>

          <div className="mb-7 flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className="rounded-full bg-cyan-400/14 px-2.75 py-1 text-xs font-bold text-cyan-400">
                  {INTERVIEW_TYPE_LABELS[session.interviewType]}
                </span>
                <SessionStatusBadge status={session.status} />
              </div>
              <h1 className="mb-1.5 font-display text-[26px] font-bold text-ink">
                {INTERVIEW_TYPE_LABELS[session.interviewType]} Interview
              </h1>
              {subtitle && <p className="text-sm text-ink-dim">{subtitle}</p>}
            </div>

            {isCompletedWithReport && (
              <button
                onClick={handleDownloadReport}
                className="inline-flex shrink-0 items-center gap-2 rounded-[11px] border border-white/14 bg-white/4 px-5 py-3 text-[13.5px] font-semibold text-ink hover:bg-white/8"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v12" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="5" y1="21" x2="19" y2="21" />
                </svg>
                Download Report
              </button>
            )}
          </div>

          {actionError && (
            <div className="mb-6">
              <FormBanner variant="error" message={actionError} />
            </div>
          )}

          {isCompleted ? (
            <>
              {reportState.status === 'error' && (
                <FormBanner variant="error" message={reportState.message} />
              )}

              {(reportState.status === 'loading' || reportState.status === 'pending') && (
                <div className="rounded-2xl border border-hairline bg-surface p-8 text-center">
                  <div
                    className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-violet-500"
                    role="status"
                    aria-label="Generating feedback report"
                  />
                  <p className="mt-3 text-sm text-ink-dim">
                    Your feedback report is still being generated&hellip;
                  </p>
                </div>
              )}

              {reportState.status === 'ready' && (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-2xl border border-hairline bg-surface p-[18px]">
                      <div className="mb-2 text-[11.5px] font-bold tracking-[0.04em] text-[#75788a] uppercase">
                        Score
                      </div>
                      <div className="font-display text-2xl font-bold">
                        <span
                          className={
                            SCORE_BAND_STYLES[getScoreBand(reportState.report.overallScore)].text
                          }
                        >
                          {reportState.report.overallScore}
                        </span>
                        <span className="text-[13px] font-semibold text-[#63667a]">/100</span>
                      </div>
                    </div>
                    <StatCard label="Status" value="Completed" />
                    <StatCard
                      label="Duration"
                      value={formatDurationMs(reportState.report.durationMs)}
                    />
                    <StatCard label="Date" value={formatShortDate(session.createdAt)} />
                  </div>

                  {reportState.report.topicCoverage.length > 0 &&
                    (reportState.report.topicCoverage.length <= STEPPER_MAX_TOPICS ? (
                      <TopicProgressionStepper entries={reportState.report.topicCoverage} />
                    ) : (
                      <TopicCoverageList entries={reportState.report.topicCoverage} />
                    ))}

                  <DifficultyProgressionChart
                    progression={reportState.report.difficultyProgression}
                  />

                  <DimensionScoreBars scores={reportState.report.dimensionScores} />

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <StrengthsCard items={reportState.report.topStrengths} />
                    <WeaknessesCard items={reportState.report.areasForImprovement} />
                  </div>

                  <RecommendationsCard items={reportState.report.recommendedNextSteps} />

                  <div className="mt-2 flex items-center justify-center gap-3">
                    <Link
                      to="/interview/new"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/16 bg-white/4 px-6 py-3.5 text-sm font-semibold text-ink no-underline hover:bg-white/8"
                    >
                      Start New Interview
                    </Link>
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-ink-dim no-underline hover:text-ink"
                    >
                      Back to Dashboard
                    </Link>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-5">
              {session.jobDescriptionContext && (
                <div className="rounded-2xl border border-hairline bg-surface p-6">
                  <h2 className="font-display text-[15.5px] font-semibold text-ink">
                    Job description
                  </h2>
                  <p className="mt-3 text-sm whitespace-pre-wrap text-[#c7c9d6]">
                    {session.jobDescriptionContext}
                  </p>
                </div>
              )}

              {session.resumeContext && (
                <div className="rounded-2xl border border-hairline bg-surface p-6">
                  <h2 className="font-display text-[15.5px] font-semibold text-ink">Resume</h2>
                  <p className="mt-3 text-sm whitespace-pre-wrap text-[#c7c9d6]">
                    {session.resumeContext}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {(session.status === 'CREATED' || session.status === 'ACTIVE') && (
                  <Link
                    to={`/sessions/${session.id}/room`}
                    className="inline-flex items-center gap-2 rounded-[11px] bg-gradient-to-br from-violet-500 to-purple-500 px-5 py-3 text-[13.5px] font-semibold text-white no-underline hover:opacity-90"
                  >
                    {session.status === 'ACTIVE' ? 'Rejoin interview' : 'Start voice interview'}
                  </Link>
                )}
                {session.status === 'CREATED' && (
                  <button
                    onClick={handleAbandon}
                    className="rounded-[11px] border border-white/14 px-4 py-3 text-[13.5px] font-semibold text-ink-dim hover:bg-white/5 hover:text-ink"
                  >
                    Mark as abandoned
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-[11px] border border-red-400/25 px-4 py-3 text-[13.5px] font-semibold text-red-300 hover:bg-red-400/10 disabled:opacity-60"
                >
                  {isDeleting ? 'Deleting…' : 'Delete session'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {showToast && (
        <div className="fixed right-7 bottom-7 z-[300] flex items-center gap-2.5 rounded-xl border border-white/12 bg-surface-2 px-5 py-3.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)]">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/16">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#34D399"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span className="text-[13.5px] font-medium text-[#f0f1f5]">
            Report downloaded successfully.
          </span>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-[18px]">
      <div className="mb-2 text-[11.5px] font-bold tracking-[0.04em] text-[#75788a] uppercase">
        {label}
      </div>
      <div className="font-display text-base font-bold text-ink">{value}</div>
    </div>
  )
}

/** Adapts the mockup's fixed 5-step "Introduction → ... → Closing" stepper
 * visual to this app's real, variable-length topicCoverage entries: a dot
 * per topic, filled+glowing when covered, hollow when not (red-tinted when
 * that miss was actually required). */
function TopicProgressionStepper({ entries }: { entries: FeedbackTopicCoverageEntry[] }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <h2 className="mb-5.5 font-display text-[15.5px] font-semibold text-ink">
        Topic Progression
      </h2>
      <div
        className="relative grid gap-2"
        style={{ gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))` }}
      >
        <div
          className="absolute top-[9px] h-px bg-violet-500/35"
          style={{ left: '10%', right: '10%' }}
          aria-hidden="true"
        />
        {entries.map((entry) => (
          <div key={entry.topic} className="relative z-10 text-center">
            <div
              className={`mx-auto mb-2.5 h-[18px] w-[18px] rounded-full ${
                entry.covered
                  ? 'bg-violet-500 shadow-[0_0_0_4px_rgba(110,86,248,0.18)]'
                  : entry.required
                    ? 'border-2 border-red-400/60 bg-transparent'
                    : 'border-2 border-white/15 bg-transparent'
              }`}
            />
            <div className="px-1 text-xs font-semibold text-[#c7c9d6]">{entry.topic}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StrengthsCard({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <div className="mb-4 flex items-center gap-2.25">
        <span className="flex h-7.5 w-7.5 items-center justify-center rounded-[9px] bg-emerald-400/14">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4ade9c"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <span className="font-display text-[15px] font-semibold text-ink">Strengths</span>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item} className="flex gap-2.25 text-[13.5px] leading-[1.55] text-[#c7c9d6]">
            <span className="shrink-0 text-emerald-400">+</span>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

function WeaknessesCard({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <div className="mb-4 flex items-center gap-2.25">
        <span className="flex h-7.5 w-7.5 items-center justify-center rounded-[9px] bg-amber-400/14">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3l10 18H2z" />
            <line x1="12" y1="10" x2="12" y2="14" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>
        <span className="font-display text-[15px] font-semibold text-ink">Weaknesses</span>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item} className="flex gap-2.25 text-[13.5px] leading-[1.55] text-[#c7c9d6]">
            <span className="shrink-0 text-amber-400">−</span>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

function RecommendationsCard({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <div className="mb-4 flex items-center gap-2.25">
        <span className="flex h-7.5 w-7.5 items-center justify-center rounded-[9px] bg-violet-500/14">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9e8cfb"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
          </svg>
        </span>
        <span className="font-display text-[15px] font-semibold text-ink">Recommendations</span>
      </div>
      <div className="flex flex-col gap-2.75">
        {items.map((item, index) => (
          <div key={item} className="flex items-center gap-2.75 rounded-xl bg-white/2 px-3.5 py-3">
            <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-[7px] bg-violet-500/18 text-[11px] font-bold text-[#9e8cfb]">
              {index + 1}
            </span>
            <span className="text-[13.5px] text-[#d5d7e0]">{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Serializes exactly what's visible on screen (plus the LLM-written summary,
 * which isn't rendered as its own section but is still worth exporting) into
 * a plain-text report — no backend endpoint for this, it's a pure
 * client-side transform of data useFeedbackReport already fetched. */
function buildReportText(
  session: InterviewSessionDto,
  report: FeedbackReportDto,
  jobRole: string | undefined,
): string {
  const lines: string[] = []
  lines.push('MENTORQ INTERVIEW REPORT')
  lines.push('========================')
  lines.push('')
  lines.push(`${INTERVIEW_TYPE_LABELS[session.interviewType]} Interview`)
  if (jobRole) lines.push(`Role: ${jobRole}`)
  lines.push(`Date: ${formatShortDate(session.createdAt)}`)
  lines.push(`Duration: ${formatDurationMs(report.durationMs)}`)
  lines.push('')
  lines.push(`Overall Score: ${report.overallScore}/100`)
  lines.push(`Difficulty Reached: ${report.difficultyReached}/5`)
  lines.push('')

  lines.push('PERFORMANCE ANALYSIS')
  for (const dimension of FEEDBACK_DIMENSION_ORDER) {
    const score = report.dimensionScores[dimension]
    const label = FEEDBACK_DIMENSION_LABELS[dimension]
    lines.push(`- ${label}: ${score === null ? 'Not assessed' : `${score}/10`}`)
  }
  lines.push('')

  if (report.topicCoverage.length > 0) {
    lines.push('TOPIC COVERAGE')
    for (const entry of report.topicCoverage) {
      lines.push(
        `- [${entry.covered ? 'x' : ' '}] ${entry.topic}${entry.required ? ' (required)' : ''}`,
      )
    }
    lines.push('')
  }

  if (report.difficultyProgression.length > 0) {
    lines.push(`Difficulty Progression: ${report.difficultyProgression.join(' -> ')}`)
    lines.push('')
  }

  lines.push('SUMMARY')
  lines.push(report.summary)
  lines.push('')

  if (report.topStrengths.length > 0) {
    lines.push('STRENGTHS')
    for (const item of report.topStrengths) lines.push(`+ ${item}`)
    lines.push('')
  }

  if (report.areasForImprovement.length > 0) {
    lines.push('AREAS FOR IMPROVEMENT')
    for (const item of report.areasForImprovement) lines.push(`- ${item}`)
    lines.push('')
  }

  if (report.recommendedNextSteps.length > 0) {
    lines.push('RECOMMENDED NEXT STEPS')
    report.recommendedNextSteps.forEach((item, index) => lines.push(`${index + 1}. ${item}`))
    lines.push('')
  }

  return lines.join('\n')
}
