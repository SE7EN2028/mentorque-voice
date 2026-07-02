import { prisma } from '@mentorque/db'
import type { InterviewType, SessionStatus } from '@mentorque/shared'

interface CreateSessionData {
  userId: string
  interviewType: InterviewType
  resumeContext?: string
  jobDescriptionContext?: string
}

interface UpdateSessionData {
  status?: SessionStatus
  resumeContext?: string
  jobDescriptionContext?: string
}

/** All Prisma access for the sessions module lives here — the service layer
 * never imports `prisma` directly. */
export const sessionsRepository = {
  create(data: CreateSessionData) {
    return prisma.interviewSession.create({ data })
  },

  findManyByUser(userId: string) {
    return prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  },

  // Scoping by userId in the query itself (not just checked afterward) means
  // a caller can never accidentally read/mutate another user's session even
  // if a future call site forgets to check ownership separately.
  findByIdAndUser(id: string, userId: string) {
    return prisma.interviewSession.findFirst({ where: { id, userId } })
  },

  update(id: string, data: UpdateSessionData) {
    return prisma.interviewSession.update({ where: { id }, data })
  },

  delete(id: string) {
    return prisma.interviewSession.delete({ where: { id } })
  },
}
