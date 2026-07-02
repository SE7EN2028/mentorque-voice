import { useCallback, useEffect, useState } from 'react'
import type { InterviewSessionDto } from '@mentorque/shared'
import { ApiError } from '../api/client'
import { sessionsApi } from '../api/sessions'

interface UseSessionsResult {
  sessions: InterviewSessionDto[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  deleteSession: (id: string) => Promise<void>
}

/** Fetches the current user's sessions once and keeps them in local state —
 * a full Context isn't warranted here since this list isn't read outside
 * the dashboard/history page (unlike auth, which genuinely is app-wide). */
export function useSessions(): UseSessionsResult {
  const [sessions, setSessions] = useState<InterviewSessionDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refetchIndex, setRefetchIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    sessionsApi
      .list()
      .then((result) => {
        if (cancelled) return
        setSessions(result)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load your sessions.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refetchIndex])

  const refetch = useCallback(() => setRefetchIndex((n) => n + 1), [])

  const deleteSession = useCallback(async (id: string) => {
    await sessionsApi.remove(id)
    setSessions((prev) => prev.filter((session) => session.id !== id))
  }, [])

  return { sessions, isLoading, error, refetch, deleteSession }
}
