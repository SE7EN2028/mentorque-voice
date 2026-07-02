import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'

/** Centralized error handler — routes throw/reject AppError for expected
 * failures (validation, auth, conflicts); anything else is logged and
 * hidden behind a generic 500 so internals never leak to the client. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  logger.error('unhandled error', { err })
  res.status(500).json({ error: 'Internal server error' })
}
