import type { Request, Response } from 'express'
import { getUserId } from '../../middleware/auth.js'
import { getRequiredParam } from '../../lib/request.js'
import { sessionsService } from './sessions.service.js'
import { voiceTokenService } from './voice-token.service.js'

export const sessionsController = {
  async create(req: Request, res: Response) {
    const session = await sessionsService.create(getUserId(req), req.body)
    res.status(201).json({ session })
  },

  async list(req: Request, res: Response) {
    const sessions = await sessionsService.listForUser(getUserId(req))
    res.status(200).json({ sessions })
  },

  async getOne(req: Request, res: Response) {
    const session = await sessionsService.getOwned(getRequiredParam(req, 'id'), getUserId(req))
    res.status(200).json({ session })
  },

  async update(req: Request, res: Response) {
    const session = await sessionsService.update(
      getRequiredParam(req, 'id'),
      getUserId(req),
      req.body,
    )
    res.status(200).json({ session })
  },

  async remove(req: Request, res: Response) {
    await sessionsService.remove(getRequiredParam(req, 'id'), getUserId(req))
    res.status(204).send()
  },

  async issueVoiceToken(req: Request, res: Response) {
    const tokenDto = await voiceTokenService.createToken(
      getRequiredParam(req, 'id'),
      getUserId(req),
    )
    res.status(200).json(tokenDto)
  },
}
