import jwt from 'jsonwebtoken'

interface AuthTokenPayload {
  sub: string
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set')
  }
  return secret
}

export function signAuthToken(userId: string): string {
  const payload: AuthTokenPayload = { sub: userId }
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload
}
