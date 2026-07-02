import { Navigate, Outlet } from 'react-router-dom'
import { FullScreenSpinner } from '../components/FullScreenSpinner'
import { useAuth } from '../context/AuthContext'

/** Guards Login/Signup — an already-authenticated user is sent straight to
 * the dashboard instead of seeing the auth forms again. */
export function PublicOnlyRoute() {
  const { status } = useAuth()

  if (status === 'loading') return <FullScreenSpinner />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
