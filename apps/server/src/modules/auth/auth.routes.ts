import { Router } from 'express'
import { loginSchema, signupSchema } from '@mentorque/shared'
import { requireAuth } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { authController } from './auth.controller.js'

export const authRouter = Router()

authRouter.post('/signup', validateBody(signupSchema), authController.signup)
authRouter.post('/login', validateBody(loginSchema), authController.login)
authRouter.post('/logout', authController.logout)
authRouter.get('/me', requireAuth, authController.me)
