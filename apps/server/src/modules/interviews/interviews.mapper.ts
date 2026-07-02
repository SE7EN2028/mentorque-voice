import type { TranscriptTurn } from '@mentorque/db'
import type { EngineTranscriptTurn } from '@mentorque/interview-engine'

/** Converts a persisted DB row into the engine's own minimal transcript
 * shape — the only point of contact between Prisma's model and the engine. */
export function toEngineTranscriptTurn(row: TranscriptTurn): EngineTranscriptTurn {
  return {
    role: row.role,
    content: row.content,
  }
}
