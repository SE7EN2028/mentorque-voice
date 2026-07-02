import type { SessionStatus } from '@mentorque/shared'

const STATUS_STYLES: Record<SessionStatus, string> = {
  CREATED: 'bg-slate-800 text-slate-300',
  ACTIVE: 'bg-indigo-950 text-indigo-300',
  CLOSING: 'bg-amber-950 text-amber-300',
  COMPLETED: 'bg-emerald-950 text-emerald-300',
  ABANDONED: 'bg-red-950 text-red-300',
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  CREATED: 'Created',
  ACTIVE: 'Active',
  CLOSING: 'Closing',
  COMPLETED: 'Completed',
  ABANDONED: 'Abandoned',
}

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}
