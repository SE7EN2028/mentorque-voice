import type { CookieOptions } from 'express'

export const COOKIE_NAME = 'mentorque_token'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Client (Vercel) and server (Render) live on different sites in production,
 * so the cookie needs SameSite=None + Secure there to be sent cross-site at
 * all. In local dev, client and server are same-site (both localhost, just
 * different ports), so Lax works without needing HTTPS.
 */
export function cookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: SEVEN_DAYS_MS,
    path: '/',
  }
}
