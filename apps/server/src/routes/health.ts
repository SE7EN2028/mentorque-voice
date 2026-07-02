import { Router } from 'express'
import type { HealthStatus } from '@mentorque/shared'

export const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  const body: HealthStatus = {
    status: 'ok',
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  }
  res.json(body)
})
