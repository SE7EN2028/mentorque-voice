import type { FeedbackTopicCoverageEntry } from '@mentorque/shared'

function CoverageIcon({ entry }: { entry: FeedbackTopicCoverageEntry }) {
  if (entry.covered) {
    return (
      <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true">
        <path
          fill="currentColor"
          d="M13.7 4.3a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L6.99 9.59l5.3-5.3a1 1 0 0 1 1.41 0Z"
        />
      </svg>
    )
  }
  if (entry.required) {
    return (
      <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4.7 4.7a1 1 0 0 1 1.4 0L8 6.59l1.9-1.9a1 1 0 1 1 1.4 1.42L9.41 8l1.9 1.9a1 1 0 0 1-1.42 1.4L8 9.41l-1.9 1.9a1 1 0 0 1-1.4-1.42L6.59 8l-1.9-1.9a1 1 0 0 1 0-1.4Z"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true">
      <path fill="currentColor" d="M4 7.25h8a.75.75 0 0 1 0 1.5H4a.75.75 0 0 1 0-1.5Z" />
    </svg>
  )
}

function coverageStatusLabel(entry: FeedbackTopicCoverageEntry): string {
  if (entry.covered) return 'Covered'
  if (entry.required) return 'Missed — required'
  return 'Not covered — optional'
}

export function TopicCoverageList({ entries }: { entries: FeedbackTopicCoverageEntry[] }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-sm font-medium text-slate-400">Topic coverage</h2>
      <ul className="mt-4 flex flex-col gap-2.5">
        {entries.map((entry) => (
          <li key={entry.topic} className="flex items-start gap-2 text-sm">
            <CoverageIcon entry={entry} />
            <span className={entry.covered ? 'text-slate-300' : 'text-slate-400'}>
              {entry.topic}
            </span>
            <span className="ml-auto shrink-0 text-xs text-slate-500">
              {coverageStatusLabel(entry)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
