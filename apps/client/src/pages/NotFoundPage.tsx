import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center text-slate-100">
      <h1 className="text-2xl font-semibold text-white">Page not found</h1>
      <Link to="/" className="text-indigo-400 hover:text-indigo-300">
        Go home
      </Link>
    </main>
  )
}
