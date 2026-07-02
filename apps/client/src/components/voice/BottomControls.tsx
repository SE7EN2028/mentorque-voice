interface BottomControlsProps {
  isMuted: boolean
  onToggleMute: () => void
  onEndInterview: () => void
  micAvailable: boolean
  isEnding: boolean
  /** Short-form phase text ("Waiting" / "Listening" / "Thinking" / "AI
   * Speaking") for the left-hand status pill — computed by the parent from
   * VoiceOrbState so this component stays decoupled from that type. */
  phaseLabel: string
}

// Keyed off the fixed set of strings the parent computes from VoiceOrbState
// (see InterviewRoomPage's PHASE_LABEL map) — falls back to a neutral dot
// for any unrecognized label instead of guessing a color.
const PHASE_DOT_COLOR: Record<string, string> = {
  'AI Speaking': 'bg-violet-400',
  Listening: 'bg-cyan-400',
  Thinking: 'bg-[#C186F5]',
  Waiting: 'bg-[#6A6D7C]',
}

export function BottomControls({
  isMuted,
  onToggleMute,
  onEndInterview,
  micAvailable,
  isEnding,
  phaseLabel,
}: BottomControlsProps) {
  // Mockup only ripples the mic while the candidate is actively being heard.
  const showRipple = phaseLabel === 'Listening' && !isMuted && micAvailable

  return (
    <div className="relative z-5 grid w-full shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-6 border-t border-hairline px-9 py-5 backdrop-blur-md">
      <div className="justify-self-start">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-4 py-2.25">
          <span
            className={`h-1.75 w-1.75 rounded-full ${PHASE_DOT_COLOR[phaseLabel] ?? 'bg-ink-dim'}`}
          />
          <span className="text-[12.5px] font-semibold text-[#D5D7E0]">{phaseLabel}</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2.25 justify-self-center">
        <div className="relative flex h-19 w-19 items-center justify-center">
          {showRipple && (
            <span className="animate-mic-ripple absolute inset-0 rounded-full border-2 border-cyan-400/50" />
          )}
          <button
            type="button"
            onClick={onToggleMute}
            disabled={!micAvailable}
            aria-pressed={isMuted}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={`flex h-17.5 w-17.5 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isMuted
                ? 'border-2 border-rose-400 bg-rose-400/12'
                : 'bg-gradient-to-br from-violet-500 to-purple-500 shadow-[0_10px_30px_-6px_rgba(110,86,248,0.55)]'
            }`}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isMuted ? '#FB7185' : '#fff'}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <line x1="8" y1="21" x2="16" y2="21" />
              {isMuted && <line x1="3" y1="3" x2="21" y2="21" />}
            </svg>
          </button>
        </div>
        <span className="text-xs font-medium text-[#75788A]">
          {!micAvailable
            ? 'Microphone unavailable'
            : isMuted
              ? 'Microphone muted'
              : 'Microphone active'}
        </span>
      </div>

      <div className="justify-self-end">
        <button
          type="button"
          onClick={onEndInterview}
          disabled={isEnding}
          className="flex items-center gap-2 rounded-xl border-[1.5px] border-rose-400/40 bg-rose-400/10 px-5.5 py-3.25 text-sm font-bold text-rose-400 transition-colors hover:bg-rose-400/18 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="9" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
          {isEnding ? 'Ending…' : 'End Interview'}
        </button>
      </div>
    </div>
  )
}
