import type { Request, Response } from 'express'
import { interviewSessionService } from '@mentorque/interview-session'
import { getUserId } from '../../middleware/auth.js'
import { getRequiredParam } from '../../lib/request.js'

export const interviewsController = {
  async start(req: Request, res: Response) {
    const result = await interviewSessionService.start(
      getRequiredParam(req, 'sessionId'),
      getUserId(req),
    )
    res.status(200).json(result)
  },

  async message(req: Request, res: Response) {
    const result = await interviewSessionService.submitMessage(
      getRequiredParam(req, 'sessionId'),
      getUserId(req),
      req.body.message,
    )
    res.status(200).json(result)
  },

  async end(req: Request, res: Response) {
    const result = await interviewSessionService.end(
      getRequiredParam(req, 'sessionId'),
      getUserId(req),
    )
    res.status(200).json(result)
  },
}
