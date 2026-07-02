import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FormBanner } from '../components/forms/FormBanner'
import { useFeedbackReport } from '../hooks/useFeedbackReport'

export function InterviewCompletePage() {
  const { id } = useParams<{ id: string }>()
  const sessionId = id ?? ''
  const navigate = useNavigate()
  const state = useFeedbackReport(sessionId)

  useEffect(() => {
    if (state.status === 'ready') {
      navigate(`/sessions/${sessionId}/report`, { replace: true })
    }
  }, [state.status, sessionId, navigate])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-white">Interview complete</h1>

        {state.status === 'error' ? (
          <div className="mt-6">
            <FormBanner variant="error" message={state.message} />
          </div>
        ) : (
          <>
            <div
              className="mx-auto mt-8 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400"
              role="status"
              aria-label="Generating feedback report"
            />
            <p className="mt-4 text-sm text-slate-400">
              Analyzing your responses and putting together your feedback report&hellip;
            </p>
          </>
        )}
      </div>
    </main>
  )
}
