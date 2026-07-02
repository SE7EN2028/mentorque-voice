import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { FeedbackDimensionScores, FeedbackReportDto } from '@mentorque/shared'
import { FormBanner } from '../components/forms/FormBanner'
import { DriftingBlobs } from '../components/layout/PageGlow'
import { getScoreBand, SCORE_BAND_LABELS, SCORE_BAND_STYLES } from '../components/report/score-band'
import {
  FEEDBACK_DIMENSION_LABELS,
  FEEDBACK_DIMENSION_ORDER,
} from '../constants/feedback-dimension'
import { INTERVIEW_TYPE_LABELS } from '../constants/interview-type'
import { useFeedbackReport } from '../hooks/useFeedbackReport'
import { useSession } from '../hooks/useSession'

function LogoMark() {
  return (
    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center gap-0.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
      <span className="h-2 w-[2.5px] rounded-sm bg-white/85" />
      <span className="h-3.5 w-[2.5px] rounded-sm bg-white" />
      <span className="h-1.25 w-[2.5px] rounded-sm bg-white/85" />
    </span>
  )
}

const CONFETTI = [
  { color: '#34D399', tx: '74px', ty: '0px', delay: 0 },
  { color: '#6E56F8', tx: '52px', ty: '-52px', delay: 0.05 },
  { color: '#22D3EE', tx: '0px', ty: '-74px', delay: 0.1 },
  { color: '#FBBF24', tx: '-52px', ty: '-52px', delay: 0.15 },
  { color: '#A855F7', tx: '-74px', ty: '0px', delay: 0.2 },
  { color: '#34D399', tx: '-52px', ty: '52px', delay: 0.25 },
  { color: '#FB7185', tx: '0px', ty: '74px', delay: 0.3 },
  { color: '#6E56F8', tx: '52px', ty: '52px', delay: 0.35 },
]

/** The celebratory checkmark badge — two pulsing glow rings plus an
 * 8-particle confetti burst, all fired once on mount. */
function CompletionBadge() {
  return (
    <div className="relative mx-auto mb-5.5 flex h-21 w-21 items-center justify-center">
      <span className="animate-ring-glow-pulse absolute -inset-3.5 rounded-full border-[1.5px] border-emerald-400/40" />
      <span
        className="animate-ring-glow-pulse absolute -inset-7 rounded-full border-[1.5px] border-emerald-400/22"
        style={{ animationDelay: '0.4s' }}
      />
      {CONFETTI.map((dot, index) => (
        <span
          key={index}
          className="animate-confetti-pop absolute top-1/2 left-1/2 -m-[3px] h-1.5 w-1.5 rounded-full"
          style={
            {
              background: dot.color,
              '--tx': dot.tx,
              '--ty': dot.ty,
              animationDelay: `${dot.delay}s`,
            } as CSSProperties
          }
        />
      ))}
      <div className="flex h-21 w-21 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 shadow-[0_14px_40px_-8px_rgba(52,211,153,0.5)]">
        <svg
          width="38"
          height="38"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#04140F"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    </div>
  )
}

const RING_RADIUS = 80
const RING_CIRCUMFERENCE = Math.round(2 * Math.PI * RING_RADIUS * 100) / 100

/** Animated ring + count-up number for the overall score — mounted only
 * once the report is ready, so its one-shot animations run exactly once. */
function ScoreReveal({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score))
  const band = getScoreBand(clamped)
  const [displayScore, setDisplayScore] = useState(0)
  const [dashOffset, setDashOffset] = useState(RING_CIRCUMFERENCE)

  useEffect(() => {
    const duration = 1200
    const start = performance.now()
    let frame: number

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      setDisplayScore(Math.round(eased * clamped))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    const ringFrame = requestAnimationFrame(() => {
      setDashOffset(RING_CIRCUMFERENCE * (1 - clamped / 100))
    })

    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(ringFrame)
    }
  }, [clamped])

  return (
    <div className="mb-10 flex flex-col items-center">
      <div className="relative flex h-50 w-50 items-center justify-center">
        <svg width="200" height="200" viewBox="0 0 200 200" className="absolute inset-0 -rotate-90">
          <circle
            cx="100"
            cy="100"
            r={RING_RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="14"
          />
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6E56F8" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
          </defs>
          <circle
            cx="100"
            cy="100"
            r={RING_RADIUS}
            fill="none"
            stroke="url(#scoreGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(0.2,0.8,0.2,1)' }}
          />
        </svg>
        <div className="text-center">
          <span className="font-display text-[52px] leading-none font-extrabold text-[#F9F9FC]">
            {displayScore}
          </span>
          <span className="text-[22px] font-semibold text-[#63667A]">/100</span>
        </div>
      </div>
      <p className="mt-3.5 text-[13.5px] text-[#8B8EA0]">Overall Score</p>
      <div
        className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 ${
          band === 'good'
            ? 'border-emerald-400/28 bg-emerald-400/12'
            : band === 'warning'
              ? 'border-amber-400/28 bg-amber-400/12'
              : 'border-red-400/28 bg-red-400/12'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${SCORE_BAND_STYLES[band].fill}`} />
        <span className={`text-[12.5px] font-bold ${SCORE_BAND_STYLES[band].text}`}>
          {SCORE_BAND_LABELS[band]}
        </span>
      </div>
    </div>
  )
}

interface DimensionStyle {
  icon: ReactNode
  iconColor: string
  bar: string
}

const DIMENSION_STYLES: Record<keyof FeedbackDimensionScores, DimensionStyle> = {
  communication: {
    icon: (
      <path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.9 8.9 0 0 1-3.6-.8L3 20l1-4.5a8.4 8.4 0 0 1-1-4A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
    ),
    iconColor: 'text-violet-400',
    bar: 'from-violet-500 to-purple-500',
  },
  technicalKnowledge: {
    icon: (
      <>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </>
    ),
    iconColor: 'text-cyan-400',
    bar: 'from-cyan-400 to-sky-400',
  },
  problemSolving: {
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="0.6" fill="currentColor" />
      </>
    ),
    iconColor: 'text-amber-400',
    bar: 'from-amber-400 to-amber-500',
  },
  confidence: {
    icon: (
      <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
    ),
    iconColor: 'text-pink-400',
    bar: 'from-pink-400 to-pink-500',
  },
  depthOfKnowledge: {
    icon: (
      <>
        <path d="M12 2 2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </>
    ),
    iconColor: 'text-indigo-400',
    bar: 'from-indigo-400 to-indigo-500',
  },
  starStructure: {
    icon: <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8-5.1-4.7 6.9-.8z" />,
    iconColor: 'text-emerald-400',
    bar: 'from-emerald-400 to-emerald-300',
  },
}

function DimensionBar({
  dimension,
  score,
}: {
  dimension: keyof FeedbackDimensionScores
  score: number | null
}) {
  const style = DIMENSION_STYLES[dimension]
  const pct = score === null ? 0 : Math.max(0, Math.min(100, (score / 10) * 100))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={style.iconColor}
          >
            {style.icon}
          </svg>
          <span className="text-[13.5px] font-semibold text-[#D5D7E0]">
            {FEEDBACK_DIMENSION_LABELS[dimension]}
          </span>
        </div>
        <span className="font-display text-[13.5px] font-bold text-ink">
          {score === null ? 'Not assessed' : `${score}/10`}
        </span>
      </div>
      <div className="h-1.75 overflow-hidden rounded-full bg-white/7">
        <div
          className={`animate-bar-grow h-full rounded-full bg-gradient-to-r ${style.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ListCard({
  icon,
  iconBg,
  title,
  items,
  markerColor,
  marker,
}: {
  icon: ReactNode
  iconBg: string
  title: string
  items: string[]
  markerColor: string
  marker: '＋' | '－'
}) {
  return (
    <div className="rounded-[20px] border border-hairline bg-surface p-6">
      <div className="mb-4 flex items-center gap-2.25">
        <div className={`flex h-7.5 w-7.5 items-center justify-center rounded-[9px] ${iconBg}`}>
          {icon}
        </div>
        <span className="font-display text-[15px] font-semibold text-ink">{title}</span>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2.25 text-[13.5px] leading-relaxed text-[#C7C9D6]">
            <span className={`shrink-0 ${markerColor}`}>{marker}</span>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

function ScoreReport({ report, sessionId }: { report: FeedbackReportDto; sessionId: string }) {
  const { session } = useSession(sessionId)

  return (
    <div className="animate-fade-up mx-auto max-w-190 px-10 pt-5 pb-22.5">
      <div className="mb-11 text-center">
        <CompletionBadge />
        <h1 className="mb-2.5 font-display text-[32px] font-bold tracking-tight text-[#F9F9FC]">
          Interview Completed
        </h1>
        <p className="mx-auto max-w-110 text-[15.5px] text-ink-dim">
          Great work — here&rsquo;s how you did in your
          {session ? ` ${INTERVIEW_TYPE_LABELS[session.interviewType]}` : ''} Interview session.
        </p>
      </div>

      <ScoreReveal score={report.overallScore} />

      <div className="mb-6 rounded-[20px] border border-hairline bg-surface p-7">
        <h2 className="mb-5 font-display text-[16.5px] font-semibold text-ink">
          Performance Breakdown
        </h2>
        <div className="flex flex-col gap-4.5">
          {FEEDBACK_DIMENSION_ORDER.map((dimension) => (
            <DimensionBar
              key={dimension}
              dimension={dimension}
              score={report.dimensionScores[dimension]}
            />
          ))}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ListCard
          icon={
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4ADE9C"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
          iconBg="bg-emerald-400/14"
          title="Strengths"
          items={report.topStrengths.slice(0, 3)}
          markerColor="text-emerald-400"
          marker="＋"
        />
        <ListCard
          icon={
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FBBF24"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l10 18H2z" />
              <line x1="12" y1="10" x2="12" y2="14" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
          iconBg="bg-amber-400/14"
          title="Weaknesses"
          items={report.areasForImprovement.slice(0, 3)}
          markerColor="text-amber-400"
          marker="－"
        />
      </div>

      <div className="mb-10 rounded-[20px] border border-hairline bg-surface p-6">
        <div className="mb-4 flex items-center gap-2.25">
          <div className="flex h-7.5 w-7.5 items-center justify-center rounded-[9px] bg-violet-500/14">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9E8CFB"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
          </div>
          <span className="font-display text-[15px] font-semibold text-ink">Recommendations</span>
        </div>
        <div className="flex flex-col gap-2.75">
          {report.recommendedNextSteps.slice(0, 3).map((step, index) => (
            <div
              key={index}
              className="flex items-center gap-2.75 rounded-xl bg-white/2 px-3.5 py-3"
            >
              <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-[7px] bg-violet-500/18 text-[11px] font-bold text-violet-400">
                {index + 1}
              </span>
              <span className="text-[13.5px] text-[#D5D7E0]">{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to={`/sessions/${sessionId}/report`}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 px-6.5 py-3.5 text-[14.5px] font-bold text-white shadow-[0_10px_26px_-8px_rgba(110,86,248,0.5)] transition-[filter] hover:brightness-110"
        >
          View Full Report
        </Link>
        <Link
          to="/interview/new"
          className="inline-flex items-center gap-2 rounded-xl border border-white/16 bg-white/4 px-6.5 py-3.5 text-[14.5px] font-semibold text-ink transition-colors hover:bg-white/8"
        >
          Start New Interview
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl px-5.5 py-3.5 text-[14.5px] font-semibold text-[#8B8EA0] transition-colors hover:text-ink"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

export function InterviewCompletePage() {
  const { id } = useParams<{ id: string }>()
  const sessionId = id ?? ''
  const state = useFeedbackReport(sessionId)

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-canvas font-sans text-ink">
      <DriftingBlobs variant="emerald-violet" />

      <div className="relative z-2 flex h-19 items-center px-10">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-display text-[16.5px] font-bold text-ink">MentorQ</span>
        </Link>
      </div>

      <div className="relative z-2">
        {state.status === 'error' && (
          <div className="mx-auto max-w-md px-6 pt-24">
            <FormBanner variant="error" message={state.message} />
          </div>
        )}

        {(state.status === 'loading' || state.status === 'pending') && (
          <div className="mx-auto max-w-md px-6 pt-32 text-center">
            <div
              className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-violet-500"
              role="status"
              aria-label="Generating feedback report"
            />
            <p className="mt-4 text-sm text-ink-dim">
              Analyzing your responses and putting together your feedback report&hellip;
            </p>
          </div>
        )}

        {state.status === 'ready' && <ScoreReport report={state.report} sessionId={sessionId} />}
      </div>
    </main>
  )
}
