interface BottomControlsProps {
  isMuted: boolean
  onToggleMute: () => void
  onEndInterview: () => void
  micAvailable: boolean
  isEnding: boolean
}

export function BottomControls({
  isMuted,
  onToggleMute,
  onEndInterview,
  micAvailable,
  isEnding,
}: BottomControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={onToggleMute}
        disabled={!micAvailable}
        aria-pressed={isMuted}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          isMuted
            ? 'border-red-900 bg-red-950/50 text-red-300'
            : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${micAvailable ? 'bg-emerald-400' : 'bg-red-400'}`}
        />
        {!micAvailable ? 'Mic unavailable' : isMuted ? 'Unmute' : 'Mute'}
      </button>

      <button
        onClick={onEndInterview}
        disabled={isEnding}
        className="rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isEnding ? 'Ending…' : 'End interview'}
      </button>
    </div>
  )
}
