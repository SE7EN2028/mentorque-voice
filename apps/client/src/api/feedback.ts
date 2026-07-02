import type { FeedbackReportDto } from '@mentorque/shared'
import { apiFetch } from './client'

export const feedbackApi = {
  getReport: (sessionId: string) =>
    apiFetch<FeedbackReportDto>(`/api/sessions/${sessionId}/report`),
}
