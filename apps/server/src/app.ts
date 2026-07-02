import express, { type Request, type Response } from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { errorHandler } from './middleware/errorHandler.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { interviewsRouter } from './modules/interviews/interviews.routes.js'
import { sessionsRouter } from './modules/sessions/sessions.routes.js'
import { uploadsRouter } from './modules/uploads/uploads.routes.js'
import { healthRouter } from './routes/health.js'

/**
 * Builds the Express app without starting it — kept separate from the
 * process bootstrap in index.ts so the app can be exercised directly
 * (e.g. from tests) without binding a port.
 */
export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    }),
  )
  app.use(express.json())
  app.use(cookieParser())

  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'))
  }

  app.use('/api/health', healthRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/sessions', sessionsRouter)
  app.use('/api/uploads', uploadsRouter)
  app.use('/api/interviews', interviewsRouter)

  // 404 for anything that didn't match a route above
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use(errorHandler)

  return app
}
