import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { FullScreenSpinner } from './components/FullScreenSpinner'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DashboardPage } from './pages/DashboardPage'
import { InterviewCompletePage } from './pages/InterviewCompletePage'
import { InterviewSetupPage } from './pages/InterviewSetupPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProfilePage } from './pages/ProfilePage'
import { SessionDetailsPage } from './pages/SessionDetailsPage'
import { SessionHistoryPage } from './pages/SessionHistoryPage'
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
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  return <LandingPage />
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
            <Route path="/sessions" element={<SessionHistoryPage />} />
            <Route path="/sessions/:id" element={<SessionDetailsPage />} />
            <Route path="/sessions/:id/complete" element={<InterviewCompletePage />} />
            <Route path="/sessions/:id/report" element={<SessionDetailsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
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
