import type { Request, Response } from 'express'
import { getUserId } from '../../middleware/auth.js'
import { getRequiredParam } from '../../lib/request.js'
import { interviewsService } from './interviews.service.js'

export const interviewsController = {
  async start(req: Request, res: Response) {
    const result = await interviewsService.start(getRequiredParam(req, 'sessionId'), getUserId(req))
    res.status(200).json(result)
  },

  async message(req: Request, res: Response) {
    const result = await interviewsService.submitMessage(
      getRequiredParam(req, 'sessionId'),
      getUserId(req),
      req.body.message,
    )
    res.status(200).json(result)
  },

  async end(req: Request, res: Response) {
    const result = await interviewsService.end(getRequiredParam(req, 'sessionId'), getUserId(req))
    res.status(200).json(result)
  },
}
