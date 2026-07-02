import type { User } from '@mentorque/db'
import type { AuthUser, LoginInput, SignupInput } from '@mentorque/shared'
import { AppError } from '../../lib/errors.js'
import { logger } from '../../lib/logger.js'
import { signAuthToken } from '../../lib/jwt.js'
import { comparePassword, hashPassword } from '../../lib/password.js'
import { authRepository } from './auth.repository.js'

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    jobRole: user.jobRole,
    experienceLevel: user.experienceLevel,
    createdAt: user.createdAt.toISOString(),
  }
}

export const authService = {
  async signup(input: SignupInput): Promise<{ user: AuthUser; token: string }> {
    const existing = await authRepository.findByEmail(input.email)
    if (existing) {
      throw new AppError(409, 'An account with this email already exists')
    }

    const passwordHash = await hashPassword(input.password)
    const user = await authRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      jobRole: input.jobRole,
      experienceLevel: input.experienceLevel,
    })

    logger.info('user signed up', { userId: user.id })

    const token = signAuthToken(user.id)
    return { user: toAuthUser(user), token }
  },

  async login(input: LoginInput): Promise<{ user: AuthUser; token: string }> {
    const user = await authRepository.findByEmail(input.email)
    if (!user) {
      // Same error as a wrong password below — never reveal which part failed.
      logger.warn('login failed: unknown email')
      throw new AppError(401, 'Invalid email or password')
    }

    const passwordMatches = await comparePassword(input.password, user.passwordHash)
    if (!passwordMatches) {
      logger.warn('login failed: bad password', { userId: user.id })
      throw new AppError(401, 'Invalid email or password')
    }

    logger.info('user logged in', { userId: user.id })

    const token = signAuthToken(user.id)
    return { user: toAuthUser(user), token }
  },

  async getById(userId: string): Promise<AuthUser> {
    const user = await authRepository.findById(userId)
    if (!user) {
      throw new AppError(401, 'Session is no longer valid')
    }
    return toAuthUser(user)
  },
}
