import { useEffect, useState } from 'react'
import type { FeedbackReportDto } from '@mentorque/shared'
import { ApiError } from '../api/client'
import { feedbackApi } from '../api/feedback'

const POLL_INTERVAL_MS = 3000

export type FeedbackReportState =
  | { status: 'loading' }
  // Report generation runs fire-and-forget on the server after the interview
  // ends — a 409 just means "not yet," so this keeps polling instead of
  // treating it as a failure.
  | { status: 'pending' }
  | { status: 'ready'; report: FeedbackReportDto }
  | { status: 'error'; message: string }

export function useFeedbackReport(sessionId: string): FeedbackReportState {
  const [state, setState] = useState<FeedbackReportState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>

    const poll = () => {
      feedbackApi
        .getReport(sessionId)
        .then((report) => {
          if (cancelled) return
          setState({ status: 'ready', report })
        })
        .catch((err: unknown) => {
          if (cancelled) return
          if (err instanceof ApiError && err.status === 409) {
            setState({ status: 'pending' })
            timeoutId = setTimeout(poll, POLL_INTERVAL_MS)
            return
          }
          setState({
            status: 'error',
            message: err instanceof ApiError ? err.message : 'Could not load the feedback report.',
          })
        })
    }

    poll()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [sessionId])

  return state
}
