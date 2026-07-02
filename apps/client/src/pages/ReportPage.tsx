import { Link, useParams } from 'react-router-dom'
import { FormBanner } from '../components/forms/FormBanner'
import { FullScreenSpinner } from '../components/FullScreenSpinner'
import { DifficultyProgressionChart } from '../components/report/DifficultyProgressionChart'
import { DimensionScoreBars } from '../components/report/DimensionScoreBars'
import { OverallScoreCard } from '../components/report/OverallScoreCard'
import { TopicCoverageList } from '../components/report/TopicCoverageList'
import { INTERVIEW_TYPE_LABELS } from '../constants/interview-type'
import { useFeedbackReport } from '../hooks/useFeedbackReport'
import { useSession } from '../hooks/useSession'

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

function ReportListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-sm font-medium text-slate-400">{title}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const sessionId = id ?? ''
  const { session, isLoading: isSessionLoading, error: sessionError } = useSession(sessionId)
  const reportState = useFeedbackReport(sessionId)

  if (isSessionLoading) {
    return <FullScreenSpinner />
  }

  if (sessionError || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <FormBanner variant="error" message={sessionError ?? 'Session not found'} />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              {INTERVIEW_TYPE_LABELS[session.interviewType]} interview report
            </h1>
            {session.endedAt && (
              <p className="mt-1 text-sm text-slate-500">
                {new Date(session.endedAt).toLocaleString()}
              </p>
            )}
          </div>
          <Link to="/dashboard" className="shrink-0 text-sm text-slate-400 hover:text-slate-200">
            Back to dashboard
          </Link>
        </div>

        <div className="mt-8 flex flex-col gap-6">
          {reportState.status === 'error' && (
            <FormBanner variant="error" message={reportState.message} />
          )}

          {(reportState.status === 'loading' || reportState.status === 'pending') && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center">
              <div
                className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400"
                role="status"
                aria-label="Generating feedback report"
              />
              <p className="mt-3 text-sm text-slate-400">
                Your feedback report is still being generated&hellip;
              </p>
            </div>
          )}

          {reportState.status === 'ready' && (
            <>
              <OverallScoreCard score={reportState.report.overallScore} />
              <DimensionScoreBars scores={reportState.report.dimensionScores} />

              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <h2 className="text-sm font-medium text-slate-400">Summary</h2>
                <p className="mt-3 text-sm whitespace-pre-wrap text-slate-300">
                  {reportState.report.summary}
                </p>
              </div>

              <TopicCoverageList entries={reportState.report.topicCoverage} />

              <DifficultyProgressionChart progression={reportState.report.difficultyProgression} />

              <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm">
                <div>
                  <dt className="text-slate-500">Difficulty reached</dt>
                  <dd className="mt-1 text-slate-300">{reportState.report.difficultyReached}/5</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Duration</dt>
                  <dd className="mt-1 text-slate-300">
                    {formatDuration(reportState.report.durationMs)}
                  </dd>
                </div>
              </dl>

              <ReportListSection title="Top strengths" items={reportState.report.topStrengths} />
              <ReportListSection
                title="Areas for improvement"
                items={reportState.report.areasForImprovement}
              />
              <ReportListSection
                title="Missed opportunities"
                items={reportState.report.missedOpportunities}
              />
              <ReportListSection
                title="Recommended next steps"
                items={reportState.report.recommendedNextSteps}
              />
              <ReportListSection
                title="Practice advice"
                items={reportState.report.actionablePracticeAdvice}
              />
            </>
          )}
        </div>
      </div>
    </main>
  )
}
