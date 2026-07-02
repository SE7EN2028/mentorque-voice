/**
 * Deliberately not apps/server's AppError — this package is imported by
 * both the Express app and the voice agent worker, neither of which this
 * package can depend on. Callers (the Express error handler, the voice
 * adapter) check for this type themselves and translate it into whatever
 * their transport needs (an HTTP status, a spoken fallback line).
 */
export class InterviewSessionError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'InterviewSessionError'
  }
}
