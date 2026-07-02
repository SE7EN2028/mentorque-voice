import { Link, useNavigate } from 'react-router-dom'
import { FormBanner } from '../components/forms/FormBanner'
import { SessionStatusBadge } from '../components/SessionStatusBadge'
import { INTERVIEW_TYPE_LABELS } from '../constants/interview-type'
import { useAuth } from '../context/AuthContext'
import { useSessions } from '../hooks/useSessions'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { sessions, isLoading, error, deleteSession } = useSessions()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function handleDelete(id: string) {
    if (window.confirm('Delete this session? This cannot be undone.')) {
      void deleteSession(id)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Welcome, {user?.name}</h1>
            <p className="text-sm text-slate-400">
              {user?.jobRole} · {user?.experienceLevel}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-900"
          >
            Log out
          </button>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Your interviews</h2>
          <Link
            to="/interview/new"
            className="rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-400"
          >
            Start new interview
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {error && <FormBanner variant="error" message={error} />}

          {isLoading && <p className="text-sm text-slate-400">Loading your sessions…</p>}

          {!isLoading && !error && sessions.length === 0 && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center text-slate-400">
              No interviews yet. Start your first one above.
            </div>
          )}

          <ul className="flex flex-col gap-3">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-4"
              >
                <Link to={`/sessions/${session.id}`} className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-white">
                      {INTERVIEW_TYPE_LABELS[session.interviewType]}
                    </span>
                    <SessionStatusBadge status={session.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </p>
                </Link>
                <button
                  onClick={() => handleDelete(session.id)}
                  className="ml-4 text-sm text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}
