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
  AI: 'AI Interviewer',
  CANDIDATE: 'You',
}

const SPEAKER_DOT: Record<TranscriptEntry['speaker'], string> = {
  AI: 'bg-gradient-to-br from-violet-500 to-purple-500',
  CANDIDATE: 'bg-gradient-to-br from-cyan-400 to-sky-400',
}

const SPEAKER_LABEL_COLOR: Record<TranscriptEntry['speaker'], string> = {
  AI: 'text-violet-400',
  CANDIDATE: 'text-cyan-400',
}

const SPEAKER_BORDER: Record<TranscriptEntry['speaker'], string> = {
  AI: 'border-violet-500/35',
  CANDIDATE: 'border-white/10',
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
    return (
      <div className="flex flex-col items-center gap-3 pt-15 text-center opacity-60">
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4A4D5C"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="2" width="6" height="11" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
        </svg>
        <p className="max-w-55 text-[13px] leading-relaxed text-[#5C5F70]">
          Your conversation will appear here once the interview begins.
        </p>
      </div>
    )
  }

  return (
    <ol className="flex flex-col gap-6">
      {entries.map((entry) => (
        <li key={entry.id} className="animate-fade-up">
          <div className="mb-2 flex items-center gap-2">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SPEAKER_DOT[entry.speaker]}`} />
            <span
              className={`text-[11.5px] font-bold tracking-[0.06em] uppercase ${SPEAKER_LABEL_COLOR[entry.speaker]}`}
            >
              {SPEAKER_LABEL[entry.speaker]}
            </span>
            {entry.isPartial && (
              <span
                className={`ml-auto shrink-0 text-[11px] ${SPEAKER_LABEL_COLOR[entry.speaker]}`}
              >
                speaking…
              </span>
            )}
          </div>
          <p
            className={`border-l-2 pl-3.75 text-[14.5px] leading-relaxed text-[#E4E5EC] ${SPEAKER_BORDER[entry.speaker]} ${entry.isPartial ? 'opacity-60' : ''}`}
          >
            {entry.text}
          </p>
        </li>
      ))}
      <div ref={bottomRef} />
    </ol>
  )
}
