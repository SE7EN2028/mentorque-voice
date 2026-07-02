import type { AgentSession, JobContext } from '@livekit/agents'
import { VOICE_UPDATES_TOPIC, type VoiceUpdatePayload } from '@mentorque/shared'

/**
 * Everything VoiceAgent needs from "the transport" — speak, publish a
 * caption/progress update, end the call. A hypothetical future swap away
 * from LiveKit (Vapi, OpenAI Realtime) means writing a new class here;
 * VoiceAgent's orchestration logic never changes.
 */
export interface VoiceSession {
  speak(text: string): Promise<void>
  publishUpdate(payload: VoiceUpdatePayload): Promise<void>
  end(): Promise<void>
}

export class LiveKitVoiceSession implements VoiceSession {
  constructor(
    private readonly session: AgentSession,
    private readonly ctx: JobContext,
  ) {}

  async speak(text: string): Promise<void> {
    this.session.say(text)
  }

  async publishUpdate(payload: VoiceUpdatePayload): Promise<void> {
    const localParticipant = this.ctx.room.localParticipant
    if (!localParticipant) return
    await localParticipant.sendText(JSON.stringify(payload), { topic: VOICE_UPDATES_TOPIC })
  }

  async end(): Promise<void> {
    this.ctx.shutdown('interview session ended')
  }
}
