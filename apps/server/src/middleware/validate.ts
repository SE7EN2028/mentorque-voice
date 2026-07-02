import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'
import { AppError } from '../lib/errors.js'

/** Validates req.body against a Zod schema and replaces it with the parsed
 * (trimmed/coerced) result — reused by every route that accepts a body. */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? 'Invalid request body'
      next(new AppError(400, message))
      return
    }
    req.body = result.data
    next()
  }
}
