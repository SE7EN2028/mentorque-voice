import { Navigate, Outlet } from 'react-router-dom'
import { FullScreenSpinner } from '../components/FullScreenSpinner'
import { useAuth } from '../context/AuthContext'

/** Guards routes that require a session. Redirects to /login once we're
 * sure there isn't one — shows a spinner instead of flash-redirecting while
 * the initial /api/auth/me check is still in flight. */
export function ProtectedRoute() {
  const { status } = useAuth()

  if (status === 'loading') return <FullScreenSpinner />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  return <Outlet />
}
