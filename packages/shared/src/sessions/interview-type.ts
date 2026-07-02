// Keep these values in sync with the InterviewType enum in
// packages/db/prisma/schema.prisma — Prisma's schema DSL can't import this.
export const INTERVIEW_TYPES = [
  'BEHAVIORAL',
  'TECHNICAL',
  'SYSTEM_DESIGN',
  'HR_CULTURE_FIT',
] as const

export type InterviewType = (typeof INTERVIEW_TYPES)[number]
