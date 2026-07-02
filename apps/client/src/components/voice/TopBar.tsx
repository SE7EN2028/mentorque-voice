import { useEffect, useState } from 'react'
import type { InterviewType } from '@mentorque/shared'
import { INTERVIEW_TYPE_LABELS } from '../../constants/interview-type'
import { ConnectionStatusBadge, type ConnectionStatus } from './ConnectionStatusBadge'

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function LogoMark() {
  return (
    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center gap-0.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
      <span className="h-2 w-[2.5px] rounded-sm bg-white/85" />
      <span className="h-3.5 w-[2.5px] rounded-sm bg-white" />
      <span className="h-1.25 w-[2.5px] rounded-sm bg-white/85" />
    </span>
  )
}

interface TopBarProps {
  interviewType: InterviewType
  startedAt: number | null
  connectionStatus: ConnectionStatus
  onLeaveInterview: () => void
}

export function TopBar({
  interviewType,
  startedAt,
  connectionStatus,
  onLeaveInterview,
}: TopBarProps) {
  const [now, setNow] = useState(() => (startedAt ? Date.now() : startedAt))

  useEffect(() => {
    if (!startedAt) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  return (
    <header className="relative z-5 flex h-[72px] shrink-0 items-center justify-between border-b border-hairline px-7 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <LogoMark />
        <div className="h-7 w-px bg-white/8" />
        <div className="font-display text-[15px] font-semibold text-ink">
          {INTERVIEW_TYPE_LABELS[interviewType]} Interview
        </div>
        <ConnectionStatusBadge status={connectionStatus} />
      </div>

      <div className="flex items-center gap-4.5">
        <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3.5 py-1.75">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ink-dim"
          >
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15.5 14" />
          </svg>
          <span className="font-display text-[13.5px] font-semibold tabular-nums text-[#E4E5EC]">
            {startedAt && now ? formatElapsed(now - startedAt) : '0:00'}
          </span>
        </div>

        <button
          type="button"
          onClick={onLeaveInterview}
          className="flex items-center gap-1.75 rounded-[10px] border border-rose-400/30 bg-rose-400/8 px-4 py-2.25 text-[13px] font-semibold text-rose-400 transition-colors hover:bg-rose-400/15"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Leave Interview
        </button>
      </div>
    </header>
  )
}
