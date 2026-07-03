import type { AgentSession, JobContext } from '@livekit/agents'
import { VOICE_UPDATES_TOPIC, type VoiceUpdatePayload } from '@mentorque/shared'

/**
 * Everything VoiceAgent needs from "the transport" — speak, publish a
 * caption/progress update, end the call. A hypothetical future swap away
 * from LiveKit (Vapi, OpenAI Realtime) means writing a new class here;
 * VoiceAgent's orchestration logic never changes.
 */
export interface VoiceSession {
  speak(text: string, options?: { awaitPlayout?: boolean }): Promise<void>
  publishUpdate(payload: VoiceUpdatePayload): Promise<void>
  end(): Promise<void>
}

export class LiveKitVoiceSession implements VoiceSession {
  constructor(
    private readonly session: AgentSession,
    private readonly ctx: JobContext,
  ) {}

  async speak(text: string, options?: { awaitPlayout?: boolean }): Promise<void> {
    const handle = this.session.say(text)
    // Terminal utterances (farewell, "already ended") must finish playing
    // before end() disconnects the room, or the candidate hears them cut
    // off after a fraction of a second — or not at all. Mid-interview
    // speech stays fire-and-forget so captions publish at speech start.
    if (options?.awaitPlayout) {
      await handle.waitForPlayout()
    }
  }

  async publishUpdate(payload: VoiceUpdatePayload): Promise<void> {
    const localParticipant = this.ctx.room.localParticipant
    if (!localParticipant) return
    // Must be publishData, not sendText: the client subscribes with
    // useDataChannel (RoomEvent.DataReceived), which never sees LiveKit
    // text streams — sendText here left the browser without transcripts,
    // orb states, or progress for the entire interview.
    await localParticipant.publishData(new TextEncoder().encode(JSON.stringify(payload)), {
      reliable: true,
      topic: VOICE_UPDATES_TOPIC,
    })
  }

  async end(): Promise<void> {
    this.ctx.shutdown('interview session ended')
  }
}
