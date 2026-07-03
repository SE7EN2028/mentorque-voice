import { RoomAgentDispatch, RoomConfiguration } from '@livekit/protocol'
import { AccessToken } from 'livekit-server-sdk'
import type { LiveKitTokenDto } from '@mentorque/shared'
import { AppError } from '../../lib/errors.js'
import { sessionsRepository } from './sessions.repository.js'

// Must match the `agentName` the worker registers with in
// apps/agent-worker — this is what ties a dispatch to that specific worker
// instead of firing an agent into every room automatically.
const AGENT_NAME = 'interview-agent'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set`)
  }
  return value
}

/**
 * Mints a room-join token that also carries an embedded agent dispatch
 * (RoomConfiguration) — one token gives the browser client both permission
 * to join and a guarantee that the interview agent joins the same room,
 * with the session/user IDs it needs passed as dispatch metadata. No
 * separate dispatch API call needed.
 */
export const voiceTokenService = {
  async createToken(sessionId: string, userId: string): Promise<LiveKitTokenDto> {
    const session = await sessionsRepository.findByIdAndUser(sessionId, userId)
    if (!session) {
      throw new AppError(404, 'Session not found')
    }
    if (session.status !== 'CREATED' && session.status !== 'ACTIVE') {
      throw new AppError(
        409,
        `Interview is not in a state that allows joining (currently ${session.status})`,
      )
    }

    const roomName = `interview-${sessionId}`

    const at = new AccessToken(requireEnv('LIVEKIT_API_KEY'), requireEnv('LIVEKIT_API_SECRET'), {
      identity: userId,
      // Longest blueprint runs 30 minutes — a token that expires exactly
      // then breaks LiveKit's reconnect/resume late in a long interview.
      ttl: '2h',
    })
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })
    at.roomConfig = new RoomConfiguration({
      agents: [
        new RoomAgentDispatch({
          agentName: AGENT_NAME,
          metadata: JSON.stringify({ interviewSessionId: sessionId, userId }),
        }),
      ],
    })

    return {
      token: await at.toJwt(),
      url: requireEnv('LIVEKIT_URL'),
      roomName,
    }
  },
}
