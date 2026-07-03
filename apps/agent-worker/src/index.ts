import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import {
  AgentSession,
  AgentSessionEventTypes,
  ServerOptions,
  cli,
  defineAgent,
  type JobContext,
} from '@livekit/agents'
import { RoomEvent } from '@livekit/rtc-node'
import { VOICE_CONTROL_TOPIC, type VoiceControlPayload } from '@mentorque/shared'
import { InterviewEngineAdapter } from './conversation-engine-adapter.js'
import { logger } from './logger.js'
import { getSpeechToTextProvider } from './providers/stt-provider.js'
import { getTextToSpeechProvider } from './providers/tts-provider.js'
import { VoiceAgent } from './voice-agent.js'
import { LiveKitVoiceSession } from './voice-session.js'

// Must match the agentName used when the token is minted (voice-token.service.ts
// in apps/server) — this opts the worker out of automatic dispatch so it only
// joins rooms explicitly dispatched to it, carrying the session metadata below.
const AGENT_NAME = 'interview-agent'

interface JobMetadata {
  interviewSessionId: string
  userId: string
}

function parseJobMetadata(raw: string | undefined): JobMetadata {
  if (!raw) {
    throw new Error('Job dispatched without metadata (missing interviewSessionId/userId)')
  }
  const parsed = JSON.parse(raw) as Partial<JobMetadata>
  if (!parsed.interviewSessionId || !parsed.userId) {
    throw new Error('Job metadata missing interviewSessionId or userId')
  }
  return { interviewSessionId: parsed.interviewSessionId, userId: parsed.userId }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const { interviewSessionId, userId } = parseJobMetadata(ctx.job.metadata)
    const conversationAdapter = new InterviewEngineAdapter()

    await ctx.connect()

    const sttProvider = getSpeechToTextProvider()
    const ttsProvider = getTextToSpeechProvider()

    const voiceAgent = new VoiceAgent(interviewSessionId, userId, conversationAdapter)

    const session = new AgentSession({
      stt: sttProvider.createSTT(),
      tts: ttsProvider.createTTS(),
      // No `llm` here — VoiceAgent.onUserTurnCompleted always intercepts
      // and throws StopResponse, so a built-in LLM plugin would never run.
      // Interruption/barge-in is on by default (turnHandling.interruption),
      // no explicit config needed.
    })

    session.on(AgentSessionEventTypes.Error, (event) => {
      logger.error('agent session error', { event, interviewSessionId })
    })

    const voiceSession = new LiveKitVoiceSession(session, ctx)
    voiceAgent.attachVoiceSession(voiceSession)

    // Forward LiveKit's own agent-state machine (idle/listening/thinking/
    // speaking) straight through — it's the authoritative source for the
    // orb's visual state, not something worth re-deriving from transcript
    // arrival timing on the client.
    session.on(AgentSessionEventTypes.AgentStateChanged, (event) => {
      const state = event.newState === 'initializing' ? 'idle' : event.newState
      void voiceSession.publishUpdate({ type: 'agent_state', state })
    })

    await session.start({ agent: voiceAgent, room: ctx.room })

    try {
      await conversationAdapter.recordVoiceMetadata(interviewSessionId, {
        livekitRoomName: ctx.room.name ?? '',
        sttProvider: sttProvider.name,
        ttsProvider: ttsProvider.name,
      })
    } catch (error) {
      // Bookkeeping only — never worth failing the interview over.
      logger.warn('failed to record voice metadata', { error, interviewSessionId })
    }

    // The client's "End interview" button and its post-connect "ready" ping
    // both ride this one control-topic handler — register it before doing
    // anything that speaks, so a client_ready arriving early is never missed.
    let resolveClientReady: (() => void) | undefined
    let clientReadySignalReceived = false
    const clientReady = new Promise<void>((resolve) => {
      resolveClientReady = resolve
    })

    ctx.room.registerTextStreamHandler(VOICE_CONTROL_TOPIC, async (reader) => {
      const raw = await reader.readAll()

      let payload: VoiceControlPayload
      try {
        payload = JSON.parse(raw) as VoiceControlPayload
      } catch {
        logger.warn('received malformed control payload', { raw, interviewSessionId })
        return
      }

      if (payload.type === 'client_ready') {
        clientReadySignalReceived = true
        resolveClientReady?.()
      } else if (payload.type === 'end_session') {
        try {
          const result = await conversationAdapter.end(interviewSessionId, userId)
          await voiceSession.speak(result.assistantMessage)
        } catch (error) {
          logger.error('failed to end interview gracefully', { error, interviewSessionId })
        } finally {
          await voiceSession.end()
        }
      }
    })

    // Don't start speaking until the candidate's browser has actually
    // finished connecting and subscribing to the updates topic — otherwise
    // the opening line's transcript/orb-state update publishes into a room
    // nobody is listening to yet (the TTS audio track would still play, but
    // the on-screen transcript and orb would silently miss the whole first
    // turn). A generous timeout keeps this from hanging forever if a client
    // never sends the signal (e.g. a non-browser test harness).
    const CLIENT_READY_TIMEOUT_MS = 8000
    const clientReadyWaitStarted = Date.now()
    await Promise.race([
      clientReady,
      new Promise<void>((resolve) => setTimeout(resolve, CLIENT_READY_TIMEOUT_MS)),
    ])
    logger.info('client-ready wait finished', {
      interviewSessionId,
      clientReadySignalReceived,
      waitedMs: Date.now() - clientReadyWaitStarted,
    })

    try {
      // Checking status (rather than always calling start()) is what makes
      // a reconnect safe: a candidate rejoining an already-ACTIVE session
      // must not hear the introduction a second time, and must not hit the
      // 409 that a second start() call against a non-CREATED session would
      // throw.
      const status = await conversationAdapter.getStatus(interviewSessionId, userId)

      if (status === 'CREATED') {
        const opening = await conversationAdapter.start(interviewSessionId, userId)
        await voiceSession.speak(opening.assistantMessage)
        await voiceSession.publishUpdate({
          type: 'transcript',
          speaker: 'AI',
          text: opening.assistantMessage,
        })
      } else if (status === 'ACTIVE') {
        await voiceSession.speak("Welcome back — let's continue where we left off.")
      } else {
        await voiceSession.speak('This interview has already ended.')
        await voiceSession.end()
        return
      }
    } catch (error) {
      logger.error('failed to start interview', { error, interviewSessionId })
      // The session may already be torn down by the time we get here — e.g.
      // a participant disconnect (a quick navigate-away-and-back, a page
      // refresh) fires LiveKit's own closeOnDisconnect teardown while this
      // handler is mid-flight. Calling session.say()/shutdown() again in
      // that state throws "AgentSession is not running", and letting that
      // escape here would crash the whole job instead of just ending it.
      try {
        await voiceSession.speak(
          "Sorry, I'm having trouble starting this interview. Please try again shortly.",
        )
      } catch (speakError) {
        logger.warn('could not deliver failure message — session already closed', {
          speakError,
          interviewSessionId,
        })
      }
      try {
        await voiceSession.end()
      } catch (endError) {
        logger.warn('session end failed — likely already shut down', {
          endError,
          interviewSessionId,
        })
      }
      return
    }

    ctx.room.on(RoomEvent.ParticipantDisconnected, () => {
      // State is persisted after every turn already (see
      // @mentorque/interview-session) — nothing extra to do here to avoid
      // losing progress. A reconnect dispatches a fresh job that resumes
      // via the status check above.
      logger.info('candidate disconnected', { interviewSessionId })
    })

    ctx.addShutdownCallback(async () => {
      logger.info('interview job shutting down', { interviewSessionId })
    })
  },
})

cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url), agentName: AGENT_NAME }))
