import { useEffect, useState } from 'react'
import type { FeedbackReportDto } from '@mentorque/shared'
import { ApiError } from '../api/client'
import { feedbackApi } from '../api/feedback'

const POLL_INTERVAL_MS = 3000
// Report generation normally lands in under a minute; if it's still 409ing
// after this many polls the generation failed hard (e.g. free-tier LLM pools
// exhausted) — surface an error instead of spinning forever.
const MAX_PENDING_POLLS = 50

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
    // Callers pass '' for a session that isn't COMPLETED yet (no report to
    // fetch) rather than conditionally calling this hook, which would
    // violate the rules of hooks — skip the request entirely instead of
    // hitting the API with a blank id.
    if (!sessionId) return

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>
    let pendingPolls = 0

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
            pendingPolls += 1
            if (pendingPolls >= MAX_PENDING_POLLS) {
              setState({
                status: 'error',
                message:
                  'Your feedback report is taking longer than expected. Please check back from your dashboard in a few minutes.',
              })
              return
            }
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
