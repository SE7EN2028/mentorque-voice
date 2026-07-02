import { Router } from 'express'
import { sendMessageSchema } from '@mentorque/shared'
import { requireAuth } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { interviewsController } from './interviews.controller.js'

export const interviewsRouter = Router()

interviewsRouter.use(requireAuth)

interviewsRouter.post('/:sessionId/start', interviewsController.start)
interviewsRouter.post(
  '/:sessionId/message',
  validateBody(sendMessageSchema),
  interviewsController.message,
)
interviewsRouter.post('/:sessionId/end', interviewsController.end)
