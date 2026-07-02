import type { Request } from 'express'
import { AppError } from './errors.js'

/** Express types route params as `string | string[] | undefined` generically
 * — for a simple `:id` segment it's always a single string when the route
 * matched, so this narrows that down instead of casting at each call site. */
export function getRequiredParam(req: Request, name: string): string {
  const value = req.params[name]
  if (typeof value !== 'string') {
    throw new AppError(400, `Missing required parameter: ${name}`)
  }
  return value
}
