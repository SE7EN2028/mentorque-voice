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

export interface VoiceControlPayload {
  type: 'end_session'
}

export const VOICE_UPDATES_TOPIC = 'interview-updates'
export const VOICE_CONTROL_TOPIC = 'control'
