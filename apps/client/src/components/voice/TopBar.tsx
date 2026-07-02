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

interface TopBarProps {
  interviewType: InterviewType
  startedAt: number | null
  connectionStatus: ConnectionStatus
}

export function TopBar({ interviewType, startedAt, connectionStatus }: TopBarProps) {
  const [now, setNow] = useState(() => (startedAt ? Date.now() : startedAt))

  useEffect(() => {
    if (!startedAt) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  return (
    <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
      <span className="text-sm font-medium text-slate-200">
        {INTERVIEW_TYPE_LABELS[interviewType]} interview
      </span>
      <span className="font-mono text-sm text-slate-400 tabular-nums">
        {startedAt && now ? formatElapsed(now - startedAt) : '0:00'}
      </span>
      <ConnectionStatusBadge status={connectionStatus} />
    </div>
  )
}
