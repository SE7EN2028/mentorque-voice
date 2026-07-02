/**
 * Shape of the API's health check response.
 * Consumed by the client to type the response of GET /api/health.
 */
export interface HealthStatus {
  status: 'ok'
  uptimeSeconds: number
  timestamp: string
}
