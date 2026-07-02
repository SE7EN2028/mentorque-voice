import { useCallback, useEffect, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useDataChannel,
  useLocalParticipant,
} from '@livekit/components-react'
import { ConnectionState } from 'livekit-client'
import { useNavigate, useParams } from 'react-router-dom'
import type { InterviewType, VoiceUpdatePayload } from '@mentorque/shared'
import { VOICE_CONTROL_TOPIC, VOICE_UPDATES_TOPIC } from '@mentorque/shared'
import { ApiError } from '../api/client'
import { sessionsApi } from '../api/sessions'
import { voiceApi } from '../api/voice'
import { FormBanner } from '../components/forms/FormBanner'
import { FullScreenSpinner } from '../components/FullScreenSpinner'
import type { ConnectionStatus } from '../components/voice/ConnectionStatusBadge'
import { BottomControls } from '../components/voice/BottomControls'
import { TopBar } from '../components/voice/TopBar'
import { TranscriptTimeline, type TranscriptEntry } from '../components/voice/TranscriptTimeline'
import { VoiceOrb, type VoiceOrbState } from '../components/voice/VoiceOrb'

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
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
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

  const handleUpdate = useCallback(
    (raw: Uint8Array) => {
      let payload: VoiceUpdatePayload
      try {
        payload = JSON.parse(new TextDecoder().decode(raw)) as VoiceUpdatePayload
      } catch {
        return
      }

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
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <TopBar
        interviewType={interviewType}
        startedAt={startedAt}
        connectionStatus={mapConnectionState(connectionState)}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6">
          <VoiceOrb state={orbState} />

          {micError && <FormBanner variant="error" message={micError} />}

          <BottomControls
            isMuted={!isMicrophoneEnabled}
            onToggleMute={handleToggleMute}
            onEndInterview={handleEndInterview}
            micAvailable={!micError}
            isEnding={isEnding}
          />
        </div>

        <aside className="hidden w-96 flex-col overflow-y-auto border-l border-slate-800 p-6 lg:flex">
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-slate-400 uppercase">
            Transcript
          </h2>
          <TranscriptTimeline entries={transcript} />
        </aside>
      </div>
    </div>
  )
}
