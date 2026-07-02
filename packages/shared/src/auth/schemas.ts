import { z } from 'zod'
import { EXPERIENCE_LEVELS } from './experience-level.js'

/**
 * Single source of truth for signup/login validation — imported by the
 * server (Express middleware) and the client (react-hook-form resolver) so
 * the two can never drift apart.
 */
export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  // bcrypt silently truncates input past 72 bytes — capped well under that.
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  jobRole: z.string().trim().min(1, 'Target job role is required').max(100),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
})
export type SignupInput = z.infer<typeof signupSchema>

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginInput = z.infer<typeof loginSchema>
