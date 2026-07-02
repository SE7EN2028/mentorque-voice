import {
  prisma,
  type Prisma,
  type SessionStatus as DbSessionStatus,
  type TurnRole,
} from '@mentorque/db'
import type { TurnAction } from '@mentorque/shared'
import type { AnswerEvaluation, EngineState } from '@mentorque/interview-engine'

interface AppendTurnInput {
  sessionId: string
  sequence: number
  role: TurnRole
  content: string
  evaluation?: AnswerEvaluation
  actionTaken?: TurnAction
  difficultyAtTurn?: number
}

interface UpdateSessionStateInput {
  engineState: EngineState
  status: DbSessionStatus
  startedAt?: Date
  endedAt?: Date
}

/** All Prisma access for the interviews module lives here. The engine
 * itself never imports this — it works purely on plain objects passed in. */
export const interviewsRepository = {
  appendTranscriptTurn(data: AppendTurnInput) {
    return prisma.transcriptTurn.create({
      data: {
        sessionId: data.sessionId,
        sequence: data.sequence,
        role: data.role,
        content: data.content,
        evaluation: data.evaluation as unknown as Prisma.InputJsonValue,
        actionTaken: data.actionTaken,
        difficultyAtTurn: data.difficultyAtTurn,
      },
    })
  },

  getRecentTurns(sessionId: string, limit: number) {
    return prisma.transcriptTurn
      .findMany({
        where: { sessionId },
        orderBy: { sequence: 'desc' },
        take: limit,
      })
      .then((turns) => turns.reverse())
  },

  countTurns(sessionId: string) {
    return prisma.transcriptTurn.count({ where: { sessionId } })
  },

  updateSessionState(sessionId: string, data: UpdateSessionStateInput) {
    return prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        engineState: data.engineState as unknown as Prisma.InputJsonValue,
        status: data.status,
        ...(data.startedAt && { startedAt: data.startedAt }),
        ...(data.endedAt && { endedAt: data.endedAt }),
      },
    })
  },
}
