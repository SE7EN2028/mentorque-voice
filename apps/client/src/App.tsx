import { useEffect, useState } from 'react'
import type { HealthStatus } from '@mentorque/shared'

type ConnectionState =
  { kind: 'loading' } | { kind: 'connected'; health: HealthStatus } | { kind: 'error' }

function App() {
  const [connection, setConnection] = useState<ConnectionState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${import.meta.env.VITE_API_URL}/api/health`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Health check failed: ${response.status}`)
        return response.json() as Promise<HealthStatus>
      })
      .then((health) => setConnection({ kind: 'connected', health }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setConnection({ kind: 'error' })
      })

    return () => controller.abort()
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="w-full max-w-xl text-center">
        <p className="mb-3 text-xs font-medium tracking-widest text-slate-500 uppercase">
          Phase 0 — Scaffold
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          AI Mock Interview Platform
        </h1>
        <p className="mt-4 text-slate-400" style={{ textWrap: 'balance' }}>
          A voice-native mock interview experience. Sign-up, interviews, and voice are not built yet
          — this page confirms the frontend, backend, and shared type pipeline are wired correctly
          end to end.
        </p>

        <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm">
          <StatusDot connection={connection} />
          <StatusLabel connection={connection} />
        </div>
      </div>
    </main>
  )
}

function StatusDot({ connection }: { connection: ConnectionState }) {
  const color =
    connection.kind === 'connected'
      ? 'bg-emerald-400'
      : connection.kind === 'error'
        ? 'bg-red-400'
        : 'bg-amber-400 animate-pulse'
  return <span className={`h-2 w-2 rounded-full ${color}`} />
}

function StatusLabel({ connection }: { connection: ConnectionState }) {
  if (connection.kind === 'loading') {
    return <span className="text-slate-400">Connecting to backend…</span>
  }
  if (connection.kind === 'error') {
    return <span className="text-red-300">Backend unreachable — is the server running?</span>
  }
  return (
    <span className="text-slate-300">
      Backend connected · uptime {Math.round(connection.health.uptimeSeconds)}s
    </span>
  )
}

export default App
