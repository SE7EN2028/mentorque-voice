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
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
