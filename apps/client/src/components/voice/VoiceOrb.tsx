export type VoiceOrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

/** Long-form copy for the status pill above the orb — distinct from
 * BottomControls' short-form phase pill, which lives in the footer. */
const STATUS_TEXT: Record<VoiceOrbState, string> = {
  idle: 'Waiting for you to begin',
  listening: 'You are speaking',
  thinking: 'AI is thinking',
  speaking: 'AI Interviewer is speaking',
}

const STATUS_DOT: Record<VoiceOrbState, string> = {
  idle: 'bg-[#6A6D7C]',
  listening: 'bg-cyan-400',
  thinking: 'bg-[#C186F5]',
  speaking: 'bg-violet-400',
}

// Slightly-varied per-bar delays make the calm/active wave read as organic
// rather than mechanically synchronized, matching the mockup.
const WAVE_DELAYS_CALM = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.15, 0.25]
const WAVE_DELAYS_ACTIVE = [0, 0.07, 0.14, 0.21, 0.28, 0.35, 0.42, 0.49, 0.56, 0.63, 0.7, 0.77]

const THINKING_DOTS = [
  { rotate: 0, color: 'bg-[#C186F5]' },
  { rotate: 120, color: 'bg-cyan-400' },
  { rotate: 240, color: 'bg-white' },
]

/** The 300px orb: a blurred radial glow, a spinning conic-gradient ring, and
 * a static radial-gradient core layered via absolute positioning — colors
 * and motion speed swap per phase (violet/idle, violet-purple-magenta/
 * speaking, cyan/listening, dot-orbit/thinking). */
function OrbVisual({ state }: { state: VoiceOrbState }) {
  return (
    <div
      className="relative h-75 w-75 shrink-0"
      role="status"
      aria-label={`Interviewer is ${state}`}
    >
      {state === 'idle' && (
        <>
          <div
            className="animate-pulse-soft absolute -inset-10 rounded-full blur-[46px]"
            style={{
              background: 'radial-gradient(circle, rgba(110,86,248,0.28), transparent 70%)',
            }}
          />
          <div
            className="absolute inset-0 rounded-full opacity-45 blur-[3px] [animation:spin_18s_linear_infinite]"
            style={{ background: 'conic-gradient(from 0deg, #4C3FBF, #6E56F8, #4C3FBF)' }}
          />
          <div
            className="animate-pulse-soft absolute inset-[26px] rounded-full"
            style={{
              background: 'radial-gradient(circle at 32% 28%, #4A3FB0, #17152A 72%)',
            }}
          />
        </>
      )}

      {state === 'speaking' && (
        <>
          <div
            className="animate-pulse-strong absolute -inset-9 rounded-full blur-[42px]"
            style={{
              background: 'radial-gradient(circle, rgba(110,86,248,0.55), transparent 70%)',
            }}
          />
          <div
            className="absolute inset-0 rounded-full opacity-90 blur-[2px] [animation:spin_2.2s_linear_infinite]"
            style={{
              background: 'conic-gradient(from 0deg, #6E56F8, #A855F7, #E14BD6, #6E56F8)',
            }}
          />
          <div
            className="animate-pulse-strong absolute inset-[26px] rounded-full shadow-[0_0_60px_rgba(110,86,248,0.4)]"
            style={{
              background: 'radial-gradient(circle at 32% 28%, #8A72FF, #4C3FBF 60%, #241F52 100%)',
            }}
          />
        </>
      )}

      {state === 'listening' && (
        <>
          <div
            className="animate-pulse-strong absolute -inset-9 rounded-full blur-[42px]"
            style={{
              background: 'radial-gradient(circle, rgba(34,211,238,0.5), transparent 70%)',
            }}
          />
          <div
            className="absolute inset-0 rounded-full opacity-85 blur-[2px] [animation:spin_2.6s_linear_infinite]"
            style={{ background: 'conic-gradient(from 0deg, #22D3EE, #38BDF8, #22D3EE)' }}
          />
          <div
            className="animate-pulse-strong absolute inset-[26px] rounded-full shadow-[0_0_60px_rgba(34,211,238,0.35)]"
            style={{
              background: 'radial-gradient(circle at 32% 28%, #5EEAD4, #0E7490 60%, #082F35 100%)',
            }}
          />
        </>
      )}

      {state === 'thinking' && (
        <>
          <div
            className="animate-pulse-soft absolute -inset-9 rounded-full blur-[46px]"
            style={{
              background: 'radial-gradient(circle, rgba(168,85,247,0.32), transparent 70%)',
            }}
          />
          <div
            className="absolute inset-[26px] rounded-full"
            style={{ background: 'radial-gradient(circle at 32% 28%, #55499C, #1C1830 72%)' }}
          />
          <div className="absolute inset-0 [animation:spin_1.3s_linear_infinite]">
            {THINKING_DOTS.map(({ rotate, color }) => (
              <span
                key={rotate}
                className={`absolute top-1/2 left-1/2 -m-[4.5px] h-[9px] w-[9px] rounded-full ${color}`}
                style={{ transform: `rotate(${rotate}deg) translate(126px)` }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** The calm gray bars (idle) or colored active bars (listening/speaking)
 * beneath the orb — thinking shows no bars, just a same-height spacer so
 * the layout doesn't jump. */
function WaveBars({ state }: { state: VoiceOrbState }) {
  if (state === 'thinking') return <div className="h-10" aria-hidden="true" />

  if (state === 'idle') {
    return (
      <div className="flex h-10 items-center gap-1.5" aria-hidden="true">
        {WAVE_DELAYS_CALM.map((delay, index) => (
          <span
            key={index}
            className="animate-wave-calm h-10 w-1 rounded-[3px] bg-gradient-to-b from-[#4A4D5C] to-[#33354A]"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
    )
  }

  const gradient =
    state === 'speaking' ? 'from-[#C3A6FB] to-violet-500' : 'from-[#7DE8F7] to-[#0E7490]'

  return (
    <div className="flex h-10 items-center gap-1.5" aria-hidden="true">
      {WAVE_DELAYS_ACTIVE.map((delay, index) => (
        <span
          key={index}
          className={`animate-wave-active h-10 w-1 rounded-[3px] bg-gradient-to-b ${gradient}`}
          style={{ animationDelay: `${delay}s` }}
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
    <div className="flex flex-col items-center gap-5.5">
      <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-4 py-1.75">
        <span className={`h-1.75 w-1.75 rounded-full ${STATUS_DOT[state]}`} />
        <span className="text-[13px] font-semibold text-[#D5D7E0]">{STATUS_TEXT[state]}</span>
      </div>

      <OrbVisual state={state} />

      <WaveBars state={state} />
    </div>
  )
}
