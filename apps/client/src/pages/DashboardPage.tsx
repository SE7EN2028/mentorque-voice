import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Welcome, {user?.name}</h1>
          <button
            onClick={handleLogout}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-900"
          >
            Log out
          </button>
        </div>
        <p className="mt-2 text-slate-400">
          {user?.jobRole} · {user?.experienceLevel}
        </p>
        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-slate-400">
          Your past interview sessions and reports will show up here — coming in a later phase.
        </div>
      </div>
    </main>
  )
}
