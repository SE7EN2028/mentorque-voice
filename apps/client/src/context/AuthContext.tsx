import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthUser, LoginInput, SignupInput } from '@mentorque/shared'
import { authApi } from '../api/auth'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  user: AuthUser | null
  status: AuthStatus
  signup: (input: SignupInput) => Promise<void>
  login: (input: LoginInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  // Restore the session on load (e.g. after a page refresh) by asking the
  // server whether the httpOnly cookie still points at a valid session.
  useEffect(() => {
    let cancelled = false

    authApi
      .me()
      .then((restoredUser) => {
        if (cancelled) return
        setUser(restoredUser)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        setUser(null)
        setStatus('unauthenticated')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const signup = useCallback(async (input: SignupInput) => {
    const newUser = await authApi.signup(input)
    setUser(newUser)
    setStatus('authenticated')
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const loggedInUser = await authApi.login(input)
    setUser(loggedInUser)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  return (
    <AuthContext.Provider value={{ user, status, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
