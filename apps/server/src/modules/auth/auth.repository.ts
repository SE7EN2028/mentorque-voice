import { prisma } from '@mentorque/db'
import type { ExperienceLevel } from '@mentorque/shared'

interface CreateUserInput {
  name: string
  email: string
  passwordHash: string
  jobRole: string
  experienceLevel: ExperienceLevel
}

/** All Prisma access for the auth module lives here — the service layer
 * never imports `prisma` directly. */
export const authRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } })
  },

  create(data: CreateUserInput) {
    return prisma.user.create({ data })
  },
}
