// Keep these values in sync with the SessionStatus enum in
// packages/db/prisma/schema.prisma — Prisma's schema DSL can't import this.
export const SESSION_STATUSES = ['CREATED', 'ACTIVE', 'CLOSING', 'COMPLETED', 'ABANDONED'] as const

export type SessionStatus = (typeof SESSION_STATUSES)[number]
