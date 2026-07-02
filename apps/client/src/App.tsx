import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { FullScreenSpinner } from './components/FullScreenSpinner'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DashboardPage } from './pages/DashboardPage'
import { InterviewSetupPage } from './pages/InterviewSetupPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SessionDetailsPage } from './pages/SessionDetailsPage'
import { SignupPage } from './pages/SignupPage'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { PublicOnlyRoute } from './routes/PublicOnlyRoute'

// LiveKit's client SDK is the single largest dependency in this app — code
// split so it's only ever downloaded by someone actually entering a live
// interview, not bundled into the login/dashboard/setup experience everyone
// else uses.
const InterviewRoomPage = lazy(() =>
  import('./pages/InterviewRoomPage').then((m) => ({ default: m.InterviewRoomPage })),
)

function RootRedirect() {
  const { status } = useAuth()
  if (status === 'loading') return <FullScreenSpinner />
  return <Navigate to={status === 'authenticated' ? '/dashboard' : '/login'} replace />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/interview/new" element={<InterviewSetupPage />} />
            <Route path="/sessions/:id" element={<SessionDetailsPage />} />
            <Route
              path="/sessions/:id/room"
              element={
                <Suspense fallback={<FullScreenSpinner />}>
                  <InterviewRoomPage />
                </Suspense>
              }
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
