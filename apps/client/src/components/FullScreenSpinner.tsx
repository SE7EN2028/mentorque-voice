export function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}
