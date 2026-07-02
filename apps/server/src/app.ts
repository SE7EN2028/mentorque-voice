import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
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

  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'))
  }

  app.use('/api/health', healthRouter)

  // 404 for anything that didn't match a route above
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' })
  })

  // Centralized error handler — routes added in later phases throw/next(err)
  // into this instead of handling errors ad hoc.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
