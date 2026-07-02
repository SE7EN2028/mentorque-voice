import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../lib/errors.js'
import { COOKIE_NAME } from '../lib/cookies.js'
import { verifyAuthToken } from '../lib/jwt.js'

declare global {
  // Declaration merging is the standard way to extend Express's Request type.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

/** Verifies the JWT cookie and attaches userId to the request. Routes behind
 * this can trust req.userId is a real, currently-valid session. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token: unknown = req.cookies?.[COOKIE_NAME]

  if (typeof token !== 'string') {
    next(new AppError(401, 'Not authenticated'))
    return
  }

  try {
    const payload = verifyAuthToken(token)
    req.userId = payload.sub
    next()
  } catch {
    next(new AppError(401, 'Session expired or invalid'))
  }
}

/** Reads req.userId set by requireAuth. Every controller behind requireAuth
 * calls this instead of asserting `req.userId!` — keeps the "not actually
 * authenticated" case an explicit, typed error instead of a silent `!`. */
export function getUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'Not authenticated')
  }
  return req.userId
}
