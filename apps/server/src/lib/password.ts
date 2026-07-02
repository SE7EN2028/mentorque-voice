import bcrypt from 'bcryptjs'

// bcrypt silently truncates input beyond 72 bytes — the signup schema caps
// password length well under that, so this is just a documented invariant.
const SALT_ROUNDS = 12

export function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS)
}

export function comparePassword(plainTextPassword: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash)
}
