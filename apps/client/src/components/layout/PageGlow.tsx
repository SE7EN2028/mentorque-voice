/** The subtle stationary radial glow behind the sticky header on every
 * authenticated list/detail page (Dashboard, Session History, Profile, etc). */
export function PageGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 right-0 left-0 h-[340px]"
      style={{
        background:
          'radial-gradient(700px 280px at 30% 0%, rgba(110,86,248,0.07), transparent 70%)',
      }}
    />
  )
}

/** The two slow-drifting blurred blobs used as ambient background motion on
 * full-bleed marketing/auth/celebration screens (Landing, Login, Signup,
 * Interview Complete). */
export function DriftingBlobs({
  variant = 'violet-cyan',
}: {
  variant?: 'violet-cyan' | 'emerald-violet'
}) {
  const colors =
    variant === 'emerald-violet'
      ? { a: 'rgba(52,211,153,0.14)', b: 'rgba(110,86,248,0.16)' }
      : { a: 'rgba(110,86,248,0.26)', b: 'rgba(34,211,238,0.16)' }

  return (
    <>
      <div
        aria-hidden="true"
        className="animate-blob-drift-1 pointer-events-none absolute -top-55 -left-45 h-160 w-160 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${colors.a}, transparent 70%)` }}
      />
      <div
        aria-hidden="true"
        className="animate-blob-drift-2 pointer-events-none absolute top-50 -right-55 h-160 w-160 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${colors.b}, transparent 70%)` }}
      />
    </>
  )
}
