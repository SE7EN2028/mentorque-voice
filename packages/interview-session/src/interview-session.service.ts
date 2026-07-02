import type { InterviewTurnResponseDto } from '@mentorque/shared'
import {
  createInitialEngineState,
  engineStateSchema,
  getBlueprint,
  getLLMProvider,
  processTurn,
  type ProcessTurnResult,
} from '@mentorque/interview-engine'
import { InterviewSessionError } from './errors.js'
import { logger } from './logger.js'
import { interviewSessionRepository } from './interview-session.repository.js'
import { toEngineTranscriptTurn } from './interview-session.mapper.js'

const RECENT_TRANSCRIPT_TURN_LIMIT = 6

// Deliberately excludes `evaluation` and `newState` from ProcessTurnResult —
// scores aren't shown to the candidate mid-interview, and engine state is
// an internal persistence detail, not part of the API contract.
function toTurnResponseDto(result: ProcessTurnResult): InterviewTurnResponseDto {
  return {
    assistantMessage: result.assistantMessage,
    action: result.action,
    difficulty: result.difficulty,
    progress: result.progress,
    isSessionOver: result.isSessionOver,
  }
}

async function getOwnedActiveSession(
  sessionId: string,
  userId: string,
  expectedStatus: 'CREATED' | 'ACTIVE',
) {
  const session = await interviewSessionRepository.findSessionByIdAndUser(sessionId, userId)
  if (!session) {
    throw new InterviewSessionError(404, 'Session not found')
  }
  if (session.status !== expectedStatus) {
    throw new InterviewSessionError(
      409,
      `Interview is not in a state that allows this action (currently ${session.status})`,
    )
  }
  return session
}

/**
 * The single place an interview session's lifecycle (start/message/end)
 * actually runs — called in-process by both the Express REST controllers
 * (apps/server) and the LiveKit voice agent (apps/agent-worker) via the
 * exact same functions, so text-mode and voice-mode can never drift apart.
 */
export const interviewSessionService = {
  async start(sessionId: string, userId: string): Promise<InterviewTurnResponseDto> {
    const session = await getOwnedActiveSession(sessionId, userId, 'CREATED')

    const candidateProfile = await interviewSessionRepository.findCandidateProfile(userId)
    if (!candidateProfile) {
      throw new InterviewSessionError(401, 'User not found')
    }

    const blueprint = getBlueprint(session.interviewType)
    const initialState = createInitialEngineState({
      interviewType: session.interviewType,
      candidateProfile,
      resumeContext: session.resumeContext,
      jobDescriptionContext: session.jobDescriptionContext,
      maxDurationMs: blueprint.expectedDurationMinutes * 60_000,
    })

    const result = await processTurn(
      {
        blueprint,
        state: initialState,
        recentTranscript: [],
        candidateMessage: null,
        elapsedMs: 0,
      },
      getLLMProvider(),
    )

    const startedAt = new Date()
    const persistedState = { ...result.newState, startedAt: startedAt.toISOString() }

    await interviewSessionRepository.appendTranscriptTurn({
      sessionId,
      sequence: 1,
      role: 'INTERVIEWER',
      content: result.assistantMessage,
      actionTaken: result.action,
      difficultyAtTurn: result.difficulty,
    })
    await interviewSessionRepository.updateSessionState(sessionId, {
      engineState: persistedState,
      status: 'ACTIVE',
      startedAt,
    })

    logger.info('interview started', { sessionId, interviewType: session.interviewType })

    return toTurnResponseDto(result)
  },

  async submitMessage(
    sessionId: string,
    userId: string,
    candidateMessage: string,
  ): Promise<InterviewTurnResponseDto> {
    const session = await getOwnedActiveSession(sessionId, userId, 'ACTIVE')

    if (!session.engineState) {
      throw new InterviewSessionError(500, 'Session is missing engine state')
    }
    const state = engineStateSchema.parse(session.engineState)
    const blueprint = getBlueprint(session.interviewType)
    const elapsedMs = state.startedAt ? Date.now() - new Date(state.startedAt).getTime() : 0

    const recentRows = await interviewSessionRepository.getRecentTurns(
      sessionId,
      RECENT_TRANSCRIPT_TURN_LIMIT,
    )
    const recentTranscript = recentRows.map(toEngineTranscriptTurn)

    const nextSequence = (await interviewSessionRepository.countTurns(sessionId)) + 1

    const result = await processTurn(
      { blueprint, state, recentTranscript, candidateMessage, elapsedMs },
      getLLMProvider(),
    )

    await interviewSessionRepository.appendTranscriptTurn({
      sessionId,
      sequence: nextSequence,
      role: 'CANDIDATE',
      content: candidateMessage,
      evaluation: result.evaluation ?? undefined,
    })
    await interviewSessionRepository.appendTranscriptTurn({
      sessionId,
      sequence: nextSequence + 1,
      role: 'INTERVIEWER',
      content: result.assistantMessage,
      actionTaken: result.action,
      difficultyAtTurn: result.difficulty,
    })

    await interviewSessionRepository.updateSessionState(sessionId, {
      engineState: { ...result.newState, elapsedMs },
      status: result.isSessionOver ? 'CLOSING' : 'ACTIVE',
      endedAt: result.isSessionOver ? new Date() : undefined,
    })

    logger.info('interview turn processed', {
      sessionId,
      action: result.action,
      difficulty: result.difficulty,
    })

    return toTurnResponseDto(result)
  },

  async end(sessionId: string, userId: string): Promise<InterviewTurnResponseDto> {
    const session = await getOwnedActiveSession(sessionId, userId, 'ACTIVE')

    if (!session.engineState) {
      throw new InterviewSessionError(500, 'Session is missing engine state')
    }
    const state = engineStateSchema.parse(session.engineState)
    const blueprint = getBlueprint(session.interviewType)
    const elapsedMs = state.startedAt ? Date.now() - new Date(state.startedAt).getTime() : 0

    const recentRows = await interviewSessionRepository.getRecentTurns(
      sessionId,
      RECENT_TRANSCRIPT_TURN_LIMIT,
    )
    const recentTranscript = recentRows.map(toEngineTranscriptTurn)
    const nextSequence = (await interviewSessionRepository.countTurns(sessionId)) + 1

    const result = await processTurn(
      {
        blueprint,
        state,
        recentTranscript,
        candidateMessage: null,
        elapsedMs,
        forceConclude: true,
      },
      getLLMProvider(),
    )

    await interviewSessionRepository.appendTranscriptTurn({
      sessionId,
      sequence: nextSequence,
      role: 'INTERVIEWER',
      content: result.assistantMessage,
      actionTaken: result.action,
      difficultyAtTurn: result.difficulty,
    })
    await interviewSessionRepository.updateSessionState(sessionId, {
      engineState: { ...result.newState, elapsedMs },
      status: 'CLOSING',
      endedAt: new Date(),
    })

    logger.info('interview ended by candidate', { sessionId })

    return toTurnResponseDto(result)
  },

  /** Used by the voice worker on (re)join to decide whether to run the
   * opening turn or just resume listening — a candidate reconnecting mid-
   * interview must not hear the introduction a second time. */
  async getStatus(sessionId: string, userId: string) {
    const session = await interviewSessionRepository.findSessionByIdAndUser(sessionId, userId)
    if (!session) {
      throw new InterviewSessionError(404, 'Session not found')
    }
    return session.status
  },

  async recordVoiceMetadata(
    sessionId: string,
    data: { livekitRoomName: string; sttProvider: string; ttsProvider: string },
  ): Promise<void> {
    await interviewSessionRepository.recordVoiceMetadata(sessionId, data)
  },
}
