import type { NextFunction, Request, Response } from 'express'
import { MulterError } from 'multer'
import { InterviewSessionError } from '@mentorque/interview-session'
import { AppError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'

/** Centralized error handler — routes throw/reject AppError (or the
 * structurally-identical InterviewSessionError, thrown by the shared
 * interview-session package that apps/server doesn't own) for expected
 * failures; anything else is logged and hidden behind a generic 500 so
 * internals never leak to the client. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError || err instanceof InterviewSessionError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  if (err instanceof MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5MB)' : 'Upload failed'
    res.status(400).json({ error: message })
    return
  }

  logger.error('unhandled error', { err })
  res.status(500).json({ error: 'Internal server error' })
}
