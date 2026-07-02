export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

const STATUS_STYLES: Record<ConnectionStatus, string> = {
  connecting: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  connected: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  reconnecting: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  disconnected: 'border-rose-400/30 bg-rose-400/10 text-rose-400',
}

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Connecting…',
  connected: 'Connected',
  reconnecting: 'Reconnecting…',
  disconnected: 'Disconnected',
}

// Only "connected" gets the soft glow-pulse ring (it reuses the shared
// keyframe's hardcoded emerald shadow); other states use a plain dot,
// pulsing gently for in-progress states and static once disconnected.
const DOT_STYLES: Record<ConnectionStatus, string> = {
  connecting: 'bg-amber-400 animate-pulse-soft',
  connected: 'bg-emerald-400 animate-dot-pulse',
  reconnecting: 'bg-amber-400 animate-pulse-soft',
  disconnected: 'bg-rose-400',
}

export function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  return (
    <span
      className={`flex items-center gap-1.75 rounded-full border px-3 py-1.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      <span className={`h-1.75 w-1.75 rounded-full ${DOT_STYLES[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  )
}
