import type { TurnAction } from '../interviews/turn-action.js'
import type { InterviewProgressDto } from '../interviews/types.js'

/** Response from POST /api/sessions/:id/token — everything the browser
 * client needs to join the interview's LiveKit room. */
export interface LiveKitTokenDto {
  token: string
  url: string
  roomName: string
}

/**
 * Data-channel payload shapes exchanged over the LiveKit room — this is the
 * entire contract between the voice layer and the browser UI. Agent-to-
 * client messages ride the "interview-updates" topic; client-to-agent
 * control signals ride "control".
 */
export interface VoiceTranscriptPayload {
  type: 'transcript'
  speaker: 'AI' | 'CANDIDATE'
  text: string
}

export interface VoiceProgressPayload {
  type: 'progress'
  action: TurnAction
  difficulty: number
  progress: InterviewProgressDto
  isSessionOver: boolean
}

/** Mirrors LiveKit Agents' own AgentState exactly ('initializing' folds into
 * 'idle' client-side) — forwarded as-is rather than inferred from transcript
 * timing, since the framework already tracks this authoritatively. */
export interface VoiceAgentStatePayload {
  type: 'agent_state'
  state: 'idle' | 'listening' | 'thinking' | 'speaking'
}

export type VoiceUpdatePayload =
  VoiceTranscriptPayload | VoiceProgressPayload | VoiceAgentStatePayload

/** 'client_ready' fixes a real startup race: the agent used to start
 * speaking the moment it joined the room, which could easily beat the
 * candidate's browser through its own token fetch + WebRTC negotiation +
 * data-channel subscription — losing the opening line's transcript/orb
 * state (the audio itself still played, since that's a separate media
 * track, but the on-screen state silently never caught up). The client
 * sends this the instant its VOICE_UPDATES_TOPIC listener is attached; the
 * agent waits for it (with a timeout fallback) before speaking. */
export type VoiceControlPayload = { type: 'end_session' } | { type: 'client_ready' }

export const VOICE_UPDATES_TOPIC = 'interview-updates'
export const VOICE_CONTROL_TOPIC = 'control'
