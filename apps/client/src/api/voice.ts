import type { LiveKitTokenDto } from '@mentorque/shared'
import { apiFetch } from './client'

export const voiceApi = {
  getToken: (sessionId: string) =>
    apiFetch<LiveKitTokenDto>(`/api/sessions/${sessionId}/token`, { method: 'POST' }),
}
