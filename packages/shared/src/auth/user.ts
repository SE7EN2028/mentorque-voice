import type { ExperienceLevel } from './experience-level.js'

/** Public-facing user shape — never includes the password hash. */
export interface AuthUser {
  id: string
  name: string
  email: string
  jobRole: string
  experienceLevel: ExperienceLevel
  createdAt: string
}
