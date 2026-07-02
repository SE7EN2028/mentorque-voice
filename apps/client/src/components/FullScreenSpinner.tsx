export function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-violet-500"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}
