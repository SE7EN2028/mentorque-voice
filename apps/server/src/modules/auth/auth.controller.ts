import type { Request, Response } from 'express'
import { COOKIE_NAME, cookieOptions } from '../../lib/cookies.js'
import { getUserId } from '../../middleware/auth.js'
import { authService } from './auth.service.js'

// Controllers stay thin: parse/shape only. Express 5 forwards rejected
// promises to the error handler automatically, so no try/catch is needed.
export const authController = {
  async signup(req: Request, res: Response) {
    const { user, token } = await authService.signup(req.body)
    res.cookie(COOKIE_NAME, token, cookieOptions())
    res.status(201).json({ user })
  },

  async login(req: Request, res: Response) {
    const { user, token } = await authService.login(req.body)
    res.cookie(COOKIE_NAME, token, cookieOptions())
    res.status(200).json({ user })
  },

  logout(_req: Request, res: Response) {
    res.clearCookie(COOKIE_NAME, cookieOptions())
    res.status(200).json({ success: true })
  },

  async me(req: Request, res: Response) {
    const user = await authService.getById(getUserId(req))
    res.status(200).json({ user })
  },
}
