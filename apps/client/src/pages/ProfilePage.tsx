import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FormBanner } from '../components/forms/FormBanner'
import { PageGlow } from '../components/layout/PageGlow'
import { PageHeader } from '../components/layout/PageHeader'
import { Sidebar } from '../components/layout/Sidebar'
import { EXPERIENCE_LEVEL_OPTIONS } from '../constants/experience-level'
import { useAuth } from '../context/AuthContext'
import { useSessionScores } from '../hooks/useSessionScores'
import { useSessions } from '../hooks/useSessions'
import { durationMinutesBetween } from '../lib/format'

/** Same first-letter + last-letter initials logic as Sidebar's avatar —
 * duplicated here rather than shared since it's a 3-line pure function and
 * this is the only other place that needs it. */
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

/** Local (not UTC) calendar-day key, so "today" lines up with the user's
 * own clock rather than shifting at UTC midnight. */
function localDayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function shiftDays(date: Date, delta: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + delta)
  return next
}

/** Consecutive-day streak counting back from today. Today itself must have
 * an active session for the streak to be non-zero. */
function computeCurrentStreak(createdAtTimestamps: string[]): number {
  const activeDays = new Set(createdAtTimestamps.map(localDayKey))
  const today = new Date()

  if (!activeDays.has(localDayKey(today.toISOString()))) return 0

  let streak = 0
  let cursor = today
  while (activeDays.has(localDayKey(cursor.toISOString()))) {
    streak += 1
    cursor = shiftDays(cursor, -1)
  }
  return streak
}

export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { sessions, isLoading: sessionsLoading, error: sessionsError } = useSessions()
  const { scores } = useSessionScores(sessions)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const stats = useMemo(() => {
    const interviewsCompleted = sessions.filter((s) => s.status === 'COMPLETED').length

    const scoreValues = Object.values(scores).filter((v): v is number => v !== null)
    const averageScore =
      scoreValues.length > 0
        ? Math.round(scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length)
        : null

    const totalMinutes = sessions.reduce((sum, s) => {
      const minutes = durationMinutesBetween(s.startedAt, s.endedAt)
      return sum + (minutes ?? 0)
    }, 0)
    const hoursPracticed = totalMinutes / 60

    const currentStreak = computeCurrentStreak(sessions.map((s) => s.createdAt))

    return { interviewsCompleted, averageScore, hoursPracticed, currentStreak }
  }, [sessions, scores])

  const experienceLabel = user
    ? EXPERIENCE_LEVEL_OPTIONS.find((opt) => opt.value === user.experienceLevel)?.label
    : undefined

  async function handleConfirmLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />

      <main className="relative min-w-0 flex-1">
        <PageGlow />

        <PageHeader
          title="Profile & Settings"
          subtitle="Manage your account and interview preferences."
        />

        <div className="animate-fade-up relative z-[1] mx-auto max-w-[820px] px-5 pt-7 pb-[70px] sm:px-10">
          {/* Profile card */}
          <div className="mb-5 flex items-center gap-5.5 rounded-[20px] border border-hairline bg-surface p-7">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 font-display text-[26px] font-bold text-white shadow-[0_10px_26px_-6px_rgba(110,86,248,0.5)]">
              {user ? initialsFor(user.name) : '—'}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-0.75 truncate font-display text-[20px] font-bold text-[#f9f9fc]">
                {user?.name}
              </div>
              <div className="mb-3 truncate text-[13.5px] text-ink-dim">{user?.email}</div>
              <div className="flex flex-wrap gap-2">
                {user?.jobRole && (
                  <span className="rounded-full bg-violet-500/13 px-3 py-1.25 text-xs font-semibold text-violet-400">
                    Target: {user.jobRole}
                  </span>
                )}
                {experienceLabel && (
                  <span className="rounded-full bg-cyan-400/13 px-3 py-1.25 text-xs font-semibold text-cyan-400">
                    {experienceLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          {sessionsError && (
            <div className="mb-5">
              <FormBanner variant="error" message={sessionsError} />
            </div>
          )}

          {sessionsLoading ? (
            <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[122px] animate-skeleton-pulse rounded-[16px] bg-white/5"
                />
              ))}
            </div>
          ) : (
            <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-[16px] border border-hairline bg-surface p-5">
                <div className="mb-4 flex h-8.5 w-8.5 items-center justify-center rounded-[10px] bg-violet-500/14">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-violet-400"
                  >
                    <path d="M8 14.5l2 2 4.5-4.5" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </div>
                <div className="font-display text-[22px] font-bold text-[#f9f9fc]">
                  {stats.interviewsCompleted}
                </div>
                <div className="mt-1.25 text-xs text-ink-dim">Interviews Completed</div>
              </div>

              <div className="rounded-[16px] border border-hairline bg-surface p-5">
                <div className="mb-4 flex h-8.5 w-8.5 items-center justify-center rounded-[10px] bg-cyan-400/14">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-cyan-400"
                  >
                    <line x1="4" y1="20" x2="4" y2="11" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="20" y1="20" x2="20" y2="15" />
                  </svg>
                </div>
                <div className="font-display text-[22px] font-bold text-[#f9f9fc]">
                  {stats.averageScore !== null ? (
                    <>
                      {stats.averageScore}
                      <span className="text-[13px] text-[#63667a]">/100</span>
                    </>
                  ) : (
                    '—'
                  )}
                </div>
                <div className="mt-1.25 text-xs text-ink-dim">Average Score</div>
              </div>

              <div className="rounded-[16px] border border-hairline bg-surface p-5">
                <div className="mb-4 flex h-8.5 w-8.5 items-center justify-center rounded-[10px] bg-amber-400/14">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-amber-400"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 7 12 12 15.5 14" />
                  </svg>
                </div>
                <div className="font-display text-[22px] font-bold text-[#f9f9fc]">
                  {stats.hoursPracticed.toFixed(1)}h
                </div>
                <div className="mt-1.25 text-xs text-ink-dim">Hours Practiced</div>
              </div>

              <div className="rounded-[16px] border border-hairline bg-surface p-5">
                <div className="mb-4 flex h-8.5 w-8.5 items-center justify-center rounded-[10px] bg-rose-400/14">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-rose-400"
                  >
                    <path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-0.5-2-1-2.5 1.5 0.5 3 2.5 3 5.5a6 6 0 0 1-12 0c0-4 2.5-6 2.5-10z" />
                  </svg>
                </div>
                <div className="font-display text-[22px] font-bold text-[#f9f9fc]">
                  {stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}
                </div>
                <div className="mt-1.25 text-xs text-ink-dim">Current Streak</div>
              </div>
            </div>
          )}

          {/* Account settings */}
          <div className="rounded-[20px] border border-hairline bg-surface px-6.5 py-2">
            <div className="pt-5 pb-1 font-display text-[15.5px] font-semibold text-ink">
              Account Settings
            </div>

            <div className="flex items-center justify-between gap-5 py-5.5">
              <div>
                <div className="mb-1 text-sm font-semibold text-[#f0f1f5]">Log out</div>
                <div className="text-[12.5px] text-[#75788a]">
                  Sign out of MentorQ on this device.
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="shrink-0 rounded-[10px] border border-rose-400/30 bg-rose-400/10 px-4.5 py-2.5 text-[13px] font-semibold text-rose-400 hover:bg-rose-400/18"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </main>

      {showLogoutConfirm && (
        <ConfirmDialog
          icon={
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-rose-400"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          }
          iconBg="bg-rose-400/14"
          title="Log out of MentorQ?"
          message="You'll need to sign back in to start your next practice session."
          confirmLabel={isLoggingOut ? 'Logging out…' : 'Log Out'}
          confirmVariant="danger"
          confirmDisabled={isLoggingOut}
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={handleConfirmLogout}
        />
      )}
    </div>
  )
}
