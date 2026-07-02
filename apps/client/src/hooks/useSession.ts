import { useCallback, useEffect, useState } from 'react'
import type { InterviewSessionDto, UpdateSessionInput } from '@mentorque/shared'
import { ApiError } from '../api/client'
import { sessionsApi } from '../api/sessions'

interface UseSessionResult {
  session: InterviewSessionDto | null
  isLoading: boolean
  error: string | null
  update: (input: UpdateSessionInput) => Promise<void>
}

export function useSession(sessionId: string): UseSessionResult {
  const [session, setSession] = useState<InterviewSessionDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    sessionsApi
      .get(sessionId)
      .then((result) => {
        if (cancelled) return
        setSession(result)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load this session.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sessionId])

  const update = useCallback(
    async (input: UpdateSessionInput) => {
      const updated = await sessionsApi.update(sessionId, input)
      setSession(updated)
    },
    [sessionId],
  )

  return { session, isLoading, error, update }
}
