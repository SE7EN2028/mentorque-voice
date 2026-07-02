/** Session-list style date, e.g. "Jun 28, 2026". */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Whole minutes between two ISO timestamps, or null if either is missing. */
export function durationMinutesBetween(
  startIso: string | null,
  endIso: string | null,
): number | null {
  if (!startIso || !endIso) return null
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  return Math.max(0, Math.round(ms / 60_000))
}

export function formatDurationMinutes(minutes: number | null): string {
  if (minutes === null) return '—'
  return `${minutes} min`
}

export function formatDurationMs(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}
