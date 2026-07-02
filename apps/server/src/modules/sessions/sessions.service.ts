import type { InterviewSession } from '@mentorque/db'
import type { CreateSessionInput, InterviewSessionDto, UpdateSessionInput } from '@mentorque/shared'
import { AppError } from '../../lib/errors.js'
import { logger } from '../../lib/logger.js'
import { sessionsRepository } from './sessions.repository.js'

function toSessionDto(session: InterviewSession): InterviewSessionDto {
  return {
    id: session.id,
    interviewType: session.interviewType,
    status: session.status,
    resumeContext: session.resumeContext,
    jobDescriptionContext: session.jobDescriptionContext,
    createdAt: session.createdAt.toISOString(),
    startedAt: session.startedAt ? session.startedAt.toISOString() : null,
    endedAt: session.endedAt ? session.endedAt.toISOString() : null,
  }
}

async function getOwnedSessionOrThrow(
  sessionId: string,
  userId: string,
): Promise<InterviewSession> {
  const session = await sessionsRepository.findByIdAndUser(sessionId, userId)
  if (!session) {
    throw new AppError(404, 'Session not found')
  }
  return session
}

export const sessionsService = {
  async create(userId: string, input: CreateSessionInput): Promise<InterviewSessionDto> {
    const session = await sessionsRepository.create({
      userId,
      interviewType: input.interviewType,
      resumeContext: input.resumeContext,
      jobDescriptionContext: input.jobDescriptionContext,
    })
    logger.info('session created', { sessionId: session.id, userId })
    return toSessionDto(session)
  },

  async listForUser(userId: string): Promise<InterviewSessionDto[]> {
    const sessions = await sessionsRepository.findManyByUser(userId)
    return sessions.map(toSessionDto)
  },

  async getOwned(sessionId: string, userId: string): Promise<InterviewSessionDto> {
    const session = await getOwnedSessionOrThrow(sessionId, userId)
    return toSessionDto(session)
  },

  async update(
    sessionId: string,
    userId: string,
    input: UpdateSessionInput,
  ): Promise<InterviewSessionDto> {
    await getOwnedSessionOrThrow(sessionId, userId)
    const updated = await sessionsRepository.update(sessionId, input)
    logger.info('session updated', { sessionId, userId })
    return toSessionDto(updated)
  },

  async remove(sessionId: string, userId: string): Promise<void> {
    await getOwnedSessionOrThrow(sessionId, userId)
    await sessionsRepository.delete(sessionId)
    logger.info('session deleted', { sessionId, userId })
  },
}
