import type { AuthUser, LoginInput, SignupInput } from '@mentorque/shared'
import { apiFetch } from './client'

interface AuthResponse {
  user: AuthUser
}

export const authApi = {
  signup: (input: SignupInput) =>
    apiFetch<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((r) => r.user),

  login: (input: LoginInput) =>
    apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((r) => r.user),

  logout: () => apiFetch<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),

  me: () => apiFetch<AuthResponse>('/api/auth/me').then((r) => r.user),
}
