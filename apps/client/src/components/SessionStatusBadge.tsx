import type { SessionStatus } from '@mentorque/shared'

const STATUS_STYLES: Record<SessionStatus, { pill: string; dot: string; pulse?: boolean }> = {
  CREATED: { pill: 'bg-white/6 border-white/10 text-[#9c9fb0]', dot: 'bg-[#7a7d8a]' },
  ACTIVE: {
    pill: 'bg-amber-400/12 border-amber-400/25 text-[#fbbf24]',
    dot: 'bg-[#fbbf24]',
    pulse: true,
  },
  CLOSING: {
    pill: 'bg-amber-400/12 border-amber-400/25 text-[#fbbf24]',
    dot: 'bg-[#fbbf24]',
    pulse: true,
  },
  COMPLETED: {
    pill: 'bg-emerald-400/12 border-emerald-400/25 text-[#34d399]',
    dot: 'bg-[#34d399]',
  },
  ABANDONED: { pill: 'bg-white/6 border-white/10 text-[#9c9fb0]', dot: 'bg-[#7a7d8a]' },
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  CREATED: 'Created',
  ACTIVE: 'In Progress',
  CLOSING: 'Finishing up',
  COMPLETED: 'Completed',
  ABANDONED: 'Abandoned',
}

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const styles = STATUS_STYLES[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles.pill}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${styles.dot} ${styles.pulse ? 'animate-dot-pulse' : ''}`}
      />
      {STATUS_LABELS[status]}
    </span>
  )
}
