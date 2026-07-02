import { Router } from 'express'
import { createSessionSchema, updateSessionSchema } from '@mentorque/shared'
import { requireAuth } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { sessionsController } from './sessions.controller.js'

export const sessionsRouter = Router()

// Applies to every route below — every endpoint in this module requires a
// valid session, per the phase spec.
sessionsRouter.use(requireAuth)

sessionsRouter.post('/', validateBody(createSessionSchema), sessionsController.create)
sessionsRouter.get('/', sessionsController.list)
sessionsRouter.get('/:id', sessionsController.getOne)
sessionsRouter.patch('/:id', validateBody(updateSessionSchema), sessionsController.update)
sessionsRouter.delete('/:id', sessionsController.remove)
sessionsRouter.post('/:id/token', sessionsController.issueVoiceToken)
