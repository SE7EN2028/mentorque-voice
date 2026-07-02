/**
 * The engine's own minimal transcript-turn shape — deliberately not the
 * Prisma TranscriptTurn row. The server maps DB rows into this before
 * calling the engine, keeping the engine ignorant of Prisma entirely.
 */
export interface EngineTranscriptTurn {
  role: 'INTERVIEWER' | 'CANDIDATE'
  content: string
}
