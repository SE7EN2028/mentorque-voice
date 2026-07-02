import {
  prisma,
  type Prisma,
  type SessionStatus as DbSessionStatus,
  type TurnRole,
} from '@mentorque/db'
import type { FeedbackReportDto, TurnAction } from '@mentorque/shared'
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

/** All Prisma access for running an interview session lives here — neither
 * the conversation engine nor any transport layer (REST, voice) touches
 * `prisma` directly. */
export const interviewSessionRepository = {
  findSessionByIdAndUser(id: string, userId: string) {
    return prisma.interviewSession.findFirst({ where: { id, userId } })
  },

  findCandidateProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, jobRole: true, experienceLevel: true },
    })
  },

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

  /** The full transcript, in order — unlike getRecentTurns, this isn't
   * bounded, because the Feedback Engine (unlike the per-turn prompt) needs
   * every turn to compute accurate coverage/difficulty/follow-up metrics. */
  getAllTurns(sessionId: string) {
    return prisma.transcriptTurn.findMany({
      where: { sessionId },
      orderBy: { sequence: 'asc' },
    })
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

  /** sessionId is @unique on FeedbackReport — one interview, one report. */
  createFeedbackReport(sessionId: string, report: FeedbackReportDto) {
    return prisma.feedbackReport.create({
      data: {
        sessionId,
        overallScore: report.overallScore,
        dimensionScores: report.dimensionScores as unknown as Prisma.InputJsonValue,
        topicCoverage: report.topicCoverage as unknown as Prisma.InputJsonValue,
        difficultyReached: report.difficultyReached,
        difficultyProgression: report.difficultyProgression,
        durationMs: report.durationMs,
        summary: report.summary,
        topStrengths: report.topStrengths,
        areasForImprovement: report.areasForImprovement,
        missedOpportunities: report.missedOpportunities,
        recommendedNextSteps: report.recommendedNextSteps,
        actionablePracticeAdvice: report.actionablePracticeAdvice,
      },
    })
  },

  getFeedbackReport(sessionId: string) {
    return prisma.feedbackReport.findUnique({ where: { sessionId } })
  },

  /** Voice-only bookkeeping — recorded once when a voice session joins.
   * Never read by the engine; purely observability/debugging metadata. */
  recordVoiceMetadata(
    sessionId: string,
    data: { livekitRoomName: string; sttProvider: string; ttsProvider: string },
  ) {
    return prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        livekitRoomName: data.livekitRoomName,
        metadata: {
          sttProvider: data.sttProvider,
          ttsProvider: data.ttsProvider,
        } as unknown as Prisma.InputJsonValue,
      },
    })
  },
}
