import { useEffect, useState } from 'react'
import type { InterviewSessionDto } from '@mentorque/shared'
import { feedbackApi } from '../api/feedback'

/** sessionId -> overall score, or null while still loading / not available
 * (report not generated, or the session was never completed). */
export type SessionScoreMap = Record<string, number | null>

/** Fetches the overall score for every COMPLETED session in parallel — the
 * session list endpoint doesn't include scores (they live in a separate
 * FeedbackReport row), so any view that wants to show scores alongside a
 * session list composes it from the two already-existing endpoints here,
 * rather than each page re-implementing the same fan-out. */
export function useSessionScores(sessions: InterviewSessionDto[]): {
  scores: SessionScoreMap
  isLoading: boolean
} {
  const [scores, setScores] = useState<SessionScoreMap>({})
  const [isLoading, setIsLoading] = useState(true)

  const completedIds = sessions
    .filter((s) => s.status === 'COMPLETED')
    .map((s) => s.id)
    .join(',')

  useEffect(() => {
    if (!completedIds) {
      setScores({})
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)

    const ids = completedIds.split(',')
    Promise.all(
      ids.map((id) =>
        feedbackApi
          .getReport(id)
          .then((report): [string, number | null] => [id, report.overallScore])
          .catch((): [string, number | null] => [id, null]),
      ),
    ).then((entries) => {
      if (cancelled) return
      setScores(Object.fromEntries(entries))
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [completedIds])

  return { scores, isLoading }
}
