export type VoiceOrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

const STATE_LABEL: Record<VoiceOrbState, string> = {
  idle: 'Waiting',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
}

const CORE_COLOR: Record<VoiceOrbState, string> = {
  idle: 'bg-slate-700',
  listening: 'bg-emerald-500',
  thinking: 'bg-amber-500',
  speaking: 'bg-indigo-500',
}

function SpeakingBars() {
  const heights = [0, 100, 200, 300, 150]
  return (
    <div className="flex h-10 items-center gap-1.5" aria-hidden="true">
      {heights.map((delay, index) => (
        <span
          key={index}
          className="animate-orb-speak-bar h-10 w-2 rounded-full bg-white/90"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  )
}

/** The interview room's single most important visual — communicates AI
 * state (idle/listening/thinking/speaking) at a glance, independent of
 * the transcript panel which supports but never replaces this. */
export function VoiceOrb({ state }: { state: VoiceOrbState }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex h-40 w-40 items-center justify-center">
        {state === 'listening' && (
          <>
            <span className="animate-orb-listen-ring absolute h-40 w-40 rounded-full border-2 border-emerald-400/70" />
            <span
              className="animate-orb-listen-ring absolute h-40 w-40 rounded-full border-2 border-emerald-400/70"
              style={{ animationDelay: '0.6s' }}
            />
          </>
        )}

        {state === 'thinking' && (
          <span className="animate-orb-think-spin absolute h-40 w-40 rounded-full border-2 border-transparent border-t-amber-400 border-r-amber-400/40" />
        )}

        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full shadow-lg transition-colors duration-500 ${CORE_COLOR[state]} ${
            state === 'idle' ? 'animate-orb-breathe' : ''
          }`}
          role="status"
          aria-label={`Interviewer is ${STATE_LABEL[state].toLowerCase()}`}
        >
          {state === 'speaking' && <SpeakingBars />}
        </div>
      </div>

      <p className="text-sm font-medium tracking-wide text-slate-400 uppercase">
        {STATE_LABEL[state]}
      </p>
    </div>
  )
}
