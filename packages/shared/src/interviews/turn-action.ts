// Keep these values in sync with the TurnAction enum in
// packages/db/prisma/schema.prisma — Prisma's schema DSL can't import this.
// The LLM proposes one of these each turn; deterministic guardrails in
// packages/interview-engine have final say over what actually happens.
export const TURN_ACTIONS = [
  'FOLLOW_UP',
  'PROBE',
  'CHALLENGE',
  'ADVANCE_TOPIC',
  'CONCLUDE',
] as const

export type TurnAction = (typeof TURN_ACTIONS)[number]
