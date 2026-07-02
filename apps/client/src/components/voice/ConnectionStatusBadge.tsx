export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

const STATUS_STYLES: Record<ConnectionStatus, string> = {
  connecting: 'bg-amber-950 text-amber-300',
  connected: 'bg-emerald-950 text-emerald-300',
  reconnecting: 'bg-amber-950 text-amber-300',
  disconnected: 'bg-red-950 text-red-300',
}

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Connecting…',
  connected: 'Connected',
  reconnecting: 'Reconnecting…',
  disconnected: 'Disconnected',
}

export function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${status === 'connected' ? 'bg-emerald-400' : status === 'disconnected' ? 'bg-red-400' : 'animate-pulse bg-amber-400'}`}
      />
      {STATUS_LABEL[status]}
    </span>
  )
}
