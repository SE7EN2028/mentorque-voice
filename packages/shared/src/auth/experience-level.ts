// Keep these values in sync with the ExperienceLevel enum in
// packages/db/prisma/schema.prisma — Prisma's schema DSL can't import this.
export const EXPERIENCE_LEVELS = ['ENTRY', 'MID', 'SENIOR', 'LEAD'] as const

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]
