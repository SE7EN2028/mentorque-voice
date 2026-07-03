import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useDataChannel,
  useLocalParticipant,
} from '@livekit/components-react'
import { ConnectionState } from 'livekit-client'
import { useNavigate, useParams } from 'react-router-dom'
import type { InterviewType, VoiceControlPayload, VoiceUpdatePayload } from '@mentorque/shared'
import { VOICE_CONTROL_TOPIC, VOICE_UPDATES_TOPIC } from '@mentorque/shared'
import { ApiError } from '../api/client'
import { sessionsApi } from '../api/sessions'
import { voiceApi } from '../api/voice'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DriftingBlobs } from '../components/layout/PageGlow'
import { FormBanner } from '../components/forms/FormBanner'
import { FullScreenSpinner } from '../components/FullScreenSpinner'
import type { ConnectionStatus } from '../components/voice/ConnectionStatusBadge'
import { BottomControls } from '../components/voice/BottomControls'
import { TopBar } from '../components/voice/TopBar'
import { TranscriptTimeline, type TranscriptEntry } from '../components/voice/TranscriptTimeline'
import { VoiceOrb, type VoiceOrbState } from '../components/voice/VoiceOrb'

// Short-form phase text for BottomControls' status pill — the long-form
// version ("AI is thinking", etc.) lives inside VoiceOrb itself.
const PHASE_LABEL: Record<VoiceOrbState, string> = {
  idle: 'Waiting',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'AI Speaking',
}

function mapConnectionState(state: ConnectionState): ConnectionStatus {
  switch (state) {
    case ConnectionState.Connected:
      return 'connected'
    case ConnectionState.Reconnecting:
      return 'reconnecting'
    case ConnectionState.Disconnected:
      return 'disconnected'
    default:
      return 'connecting'
  }
}

type JoinState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; token: string; url: string; interviewType: InterviewType }

export function InterviewRoomPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [joinState, setJoinState] = useState<JoinState>({ status: 'loading' })

  useEffect(() => {
    if (!id) return
    let cancelled = false

    Promise.all([voiceApi.getToken(id), sessionsApi.get(id)])
      .then(([tokenDto, session]) => {
        if (cancelled) return
        setJoinState({
          status: 'ready',
          token: tokenDto.token,
          url: tokenDto.url,
          interviewType: session.interviewType,
        })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setJoinState({
          status: 'error',
          message: error instanceof ApiError ? error.message : 'Could not join this interview.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [id])

  if (joinState.status === 'loading') return <FullScreenSpinner />

  if (joinState.status === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <FormBanner variant="error" message={joinState.message} />
      </main>
    )
  }

  return (
    <LiveKitRoom
      serverUrl={joinState.url}
      token={joinState.token}
      connect
      audio
      video={false}
      onDisconnected={() => navigate(`/sessions/${id}/complete`, { replace: true })}
    >
      <RoomAudioRenderer />
      <InterviewRoomContent interviewType={joinState.interviewType} sessionId={id ?? ''} />
    </LiveKitRoom>
  )
}

function InterviewRoomContent({
  interviewType,
  sessionId,
}: {
  interviewType: InterviewType
  sessionId: string
}) {
  const navigate = useNavigate()
  const connectionState = useConnectionState()
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant()

  const [orbState, setOrbState] = useState<VoiceOrbState>('idle')
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [micError, setMicError] = useState<string | null>(null)
  const [isEnding, setIsEnding] = useState(false)
  const [dialog, setDialog] = useState<'end' | 'leave' | null>(null)

  const agentHeardFromRef = useRef(false)

  const handleUpdate = useCallback(
    (raw: Uint8Array) => {
      let payload: VoiceUpdatePayload
      try {
        payload = JSON.parse(new TextDecoder().decode(raw)) as VoiceUpdatePayload
      } catch {
        return
      }

      agentHeardFromRef.current = true

      if (payload.type === 'agent_state') {
        setOrbState(payload.state)
      } else if (payload.type === 'transcript') {
        setTranscript((prev) => [
          ...prev,
          { id: `${prev.length}-${payload.speaker}`, speaker: payload.speaker, text: payload.text },
        ])
        setStartedAt((prev) => prev ?? Date.now())
      } else if (payload.type === 'progress' && payload.isSessionOver) {
        // Give the closing line a few seconds to finish playing before
        // leaving the room — the LiveKitRoom's onDisconnected handler
        // (in the parent) also covers the case where the agent hangs up
        // first.
        setTimeout(() => navigate(`/sessions/${sessionId}/complete`, { replace: true }), 4000)
      }
    },
    [navigate, sessionId],
  )

  useDataChannel(VOICE_UPDATES_TOPIC, (message) => handleUpdate(message.payload))

  // Tells the agent-worker this browser's data-channel listener is actually
  // subscribed now, so it knows it's safe to start speaking — see
  // VoiceControlPayload's client_ready doc comment for the race this closes.
  // A single fire-and-forget send isn't enough: the agent-worker takes a few
  // seconds to spin up and join the room (spawning its job process, running
  // model init, calling session.start()), so the first ping almost always
  // gets sent — and dropped — before the agent's own control-topic handler
  // even exists. Resending on an interval until the agent actually speaks
  // guarantees at least one ping lands after that handler is registered.
  useEffect(() => {
    // sendText can reject (e.g. the data transport isn't up yet right after
    // joining) — that's expected on early attempts and the next retry tick
    // covers it, so failures here are silently ignored rather than logged.
    const send = () =>
      void localParticipant
        .sendText(JSON.stringify({ type: 'client_ready' } satisfies VoiceControlPayload), {
          topic: VOICE_CONTROL_TOPIC,
        })
        .catch(() => {})

    send()
    const intervalId = setInterval(() => {
      if (agentHeardFromRef.current) {
        clearInterval(intervalId)
        return
      }
      send()
    }, 500)

    return () => clearInterval(intervalId)
  }, [localParticipant])

  useEffect(() => {
    localParticipant.setMicrophoneEnabled(true).catch(() => {
      setMicError('Microphone unavailable — check your browser permissions.')
    })
  }, [localParticipant])

  const handleToggleMute = useCallback(() => {
    void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
  }, [localParticipant, isMicrophoneEnabled])

  const handleEndInterview = useCallback(async () => {
    setIsEnding(true)
    await localParticipant.sendText(JSON.stringify({ type: 'end_session' }), {
      topic: VOICE_CONTROL_TOPIC,
    })
  }, [localParticipant])

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-canvas font-sans text-ink">
      <DriftingBlobs variant="violet-cyan" />

      <TopBar
        interviewType={interviewType}
        startedAt={startedAt}
        connectionStatus={mapConnectionState(connectionState)}
        onLeaveInterview={() => setDialog('leave')}
      />

      <div className="relative z-2 flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-5.5 p-5">
          <VoiceOrb state={orbState} />

          {micError && <FormBanner variant="error" message={micError} />}
        </div>

        <aside className="hidden w-95 shrink-0 flex-col border-l border-hairline bg-white/[0.012] lg:flex">
          <div className="flex shrink-0 items-center gap-2.25 border-b border-hairline px-5.5 py-4.75">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9C9FB0"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="14" x2="15" y2="14" />
              <line x1="9" y1="17.5" x2="15" y2="17.5" />
            </svg>
            <span className="font-display text-[14.5px] font-semibold text-ink">
              Live Transcript
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-5.5">
            <TranscriptTimeline entries={transcript} />
          </div>
        </aside>
      </div>

      <BottomControls
        isMuted={!isMicrophoneEnabled}
        onToggleMute={handleToggleMute}
        onEndInterview={() => setDialog('end')}
        micAvailable={!micError}
        isEnding={isEnding}
        phaseLabel={PHASE_LABEL[orbState]}
      />

      {dialog === 'end' && (
        <ConfirmDialog
          icon={
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9E8CFB"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8-5.1-4.7 6.9-.8z" />
            </svg>
          }
          iconBg="bg-violet-500/14"
          title="End this interview?"
          message="You'll get your feedback and score right away. This can't be undone."
          confirmLabel="End Interview"
          confirmVariant="brand"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null)
            void handleEndInterview()
          }}
        />
      )}

      {dialog === 'leave' && (
        <ConfirmDialog
          icon={
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FB7185"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
          iconBg="bg-rose-400/14"
          title="Leave without finishing?"
          message="Your progress won't be scored and this session will be discarded."
          confirmLabel="Leave Interview"
          confirmVariant="danger"
          onCancel={() => setDialog(null)}
          onConfirm={() => navigate('/dashboard', { replace: true })}
        />
      )}
    </div>
  )
}
