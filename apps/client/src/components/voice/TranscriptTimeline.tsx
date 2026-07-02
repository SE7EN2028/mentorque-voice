import { useEffect, useRef } from 'react'

export interface TranscriptEntry {
  id: string
  speaker: 'AI' | 'CANDIDATE'
  text: string
  /** True while a turn is still being transcribed/generated — rendered
   * dimmed, replaced in place once the final version arrives. */
  isPartial?: boolean
}

const SPEAKER_LABEL: Record<TranscriptEntry['speaker'], string> = {
  AI: 'Interviewer',
  CANDIDATE: 'You',
}

const SPEAKER_COLOR: Record<TranscriptEntry['speaker'], string> = {
  AI: 'text-indigo-400',
  CANDIDATE: 'text-emerald-400',
}

/**
 * A chronological timeline, not a chat UI — no bubbles, no left/right
 * split by sender. This supports the live conversation; it should never
 * become the thing the candidate is primarily looking at.
 */
export function TranscriptTimeline({ entries }: { entries: TranscriptEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [entries.length])

  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">The transcript will appear here as you talk.</p>
  }

  return (
    <ol className="flex flex-col gap-4">
      {entries.map((entry) => (
        <li key={entry.id} className={entry.isPartial ? 'opacity-60' : undefined}>
          <span
            className={`text-xs font-semibold tracking-wide uppercase ${SPEAKER_COLOR[entry.speaker]}`}
          >
            {SPEAKER_LABEL[entry.speaker]}
          </span>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-200">{entry.text}</p>
        </li>
      ))}
      <div ref={bottomRef} />
    </ol>
  )
}
