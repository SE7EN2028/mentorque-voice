import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { sessionsApi } from '../api/sessions'
import { FormBanner } from '../components/forms/FormBanner'
import { FullScreenSpinner } from '../components/FullScreenSpinner'
import { SessionStatusBadge } from '../components/SessionStatusBadge'
import { INTERVIEW_TYPE_LABELS } from '../constants/interview-type'
import { useSession } from '../hooks/useSession'

export function SessionDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session, isLoading, error, update } = useSession(id ?? '')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  if (isLoading) {
    return <FullScreenSpinner />
  }

  if (error || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <FormBanner variant="error" message={error ?? 'Session not found'} />
      </main>
    )
  }

  const handleAbandon = async () => {
    setActionError(null)
    try {
      await update({ status: 'ABANDONED' })
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update session.')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this session? This cannot be undone.')) return
    setIsDeleting(true)
    try {
      await sessionsApi.remove(session.id)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not delete session.')
      setIsDeleting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">
            {INTERVIEW_TYPE_LABELS[session.interviewType]}
          </h1>
          <SessionStatusBadge status={session.status} />
        </div>

        {actionError && (
          <div className="mt-4">
            <FormBanner variant="error" message={actionError} />
          </div>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Created</dt>
            <dd className="text-slate-300">{new Date(session.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Completed</dt>
            <dd className="text-slate-300">
              {session.endedAt ? new Date(session.endedAt).toLocaleString() : '—'}
            </dd>
          </div>
        </dl>

        {session.jobDescriptionContext && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-slate-400">Job description</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
              {session.jobDescriptionContext}
            </p>
          </div>
        )}

        {session.resumeContext && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-slate-400">Resume</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
              {session.resumeContext}
            </p>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          {(session.status === 'CREATED' || session.status === 'ACTIVE') && (
            <Link
              to={`/sessions/${session.id}/room`}
              className="rounded-md bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-400"
            >
              {session.status === 'ACTIVE' ? 'Rejoin interview' : 'Start voice interview'}
            </Link>
          )}
          {session.status === 'COMPLETED' && (
            <Link
              to={`/sessions/${session.id}/report`}
              className="rounded-md bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-400"
            >
              View report
            </Link>
          )}
          {session.status === 'CREATED' && (
            <button
              onClick={handleAbandon}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-900"
            >
              Mark as abandoned
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-md border border-red-900 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950/50 disabled:opacity-60"
          >
            {isDeleting ? 'Deleting…' : 'Delete session'}
          </button>
        </div>
      </div>
    </main>
  )
}
