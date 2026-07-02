import type { CreateSessionInput, InterviewSessionDto, UpdateSessionInput } from '@mentorque/shared'
import { apiFetch } from './client'

export const sessionsApi = {
  create: (input: CreateSessionInput) =>
    apiFetch<{ session: InterviewSessionDto }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((r) => r.session),

  list: () =>
    apiFetch<{ sessions: InterviewSessionDto[] }>('/api/sessions').then((r) => r.sessions),

  get: (id: string) =>
    apiFetch<{ session: InterviewSessionDto }>(`/api/sessions/${id}`).then((r) => r.session),

  update: (id: string, input: UpdateSessionInput) =>
    apiFetch<{ session: InterviewSessionDto }>(`/api/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }).then((r) => r.session),

  remove: (id: string) => apiFetch<void>(`/api/sessions/${id}`, { method: 'DELETE' }),
}
