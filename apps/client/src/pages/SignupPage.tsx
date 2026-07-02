import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { signupSchema, type SignupInput } from '@mentorque/shared'
import { ApiError } from '../api/client'
import { DriftingBlobs } from '../components/layout/PageGlow'
import { FormBanner } from '../components/forms/FormBanner'
import { PasswordField } from '../components/forms/PasswordField'
import { SubmitButton } from '../components/forms/SubmitButton'
import { TextField } from '../components/forms/TextField'
import { EXPERIENCE_LEVEL_OPTIONS } from '../constants/experience-level'
import { useAuth } from '../context/AuthContext'

function LogoMark() {
  return (
    <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center gap-[2.5px] rounded-[9px] bg-gradient-to-br from-violet-500 to-purple-500 shadow-[0_4px_14px_-2px_rgba(110,86,248,0.55)]">
      <span className="h-[9px] w-[3px] rounded-sm bg-white/85" />
      <span className="h-4 w-[3px] rounded-sm bg-white" />
      <span className="h-1.5 w-[3px] rounded-sm bg-white/85" />
    </span>
  )
}

// Short labels for the segmented-control buttons — the full descriptive
// copy (e.g. "Entry-level (0-2 years)") lives in EXPERIENCE_LEVEL_OPTIONS
// and is still the single source of truth for the option's value/label
// pairing; this is purely a compact visual label for the 4-wide pill row.
const EXPERIENCE_LEVEL_SHORT_LABELS: Record<string, string> = {
  ENTRY: 'Entry',
  MID: 'Mid-level',
  SENIOR: 'Senior',
  LEAD: 'Lead',
}

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      jobRole: '',
      experienceLevel: 'ENTRY',
    },
  })

  const experienceLevel = watch('experienceLevel')

  async function onSubmit(values: SignupInput) {
    setServerError(null)
    try {
      await signup(values)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      )
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-canvas px-6 font-sans text-ink">
      <DriftingBlobs variant="violet-cyan" />

      <Link to="/" className="relative z-2 mt-14 mb-7 flex items-center gap-2.5">
        <LogoMark />
        <span className="font-display text-[19px] font-bold tracking-tight text-ink">MentorQ</span>
      </Link>

      <div className="animate-fade-up relative z-2 mb-14 w-full max-w-115 rounded-2xl border border-hairline bg-surface px-10 py-9.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
        <h1 className="mb-2 font-display text-[26px] font-bold tracking-tight text-[#F9F9FC]">
          Create your account
        </h1>
        <p className="mb-6.5 text-[14.5px] text-ink-dim">
          Set up your profile and start practicing in minutes.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {serverError && <FormBanner variant="error" message={serverError} />}
          <TextField
            label="Full Name"
            placeholder="Alex Morgan"
            autoComplete="name"
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <PasswordField
            label="Password"
            placeholder="Create a password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <TextField
            label="Target Job Role"
            placeholder="e.g. Frontend Engineer"
            error={errors.jobRole?.message}
            {...register('jobRole')}
          />

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[13px] font-semibold text-[#c7c9d6]">Experience Level</label>
            <div className="grid grid-cols-4 gap-2 rounded-[11px] border border-white/10 bg-white/3 p-1">
              {EXPERIENCE_LEVEL_OPTIONS.map((option) => {
                const active = experienceLevel === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    title={option.label}
                    aria-pressed={active}
                    onClick={() =>
                      setValue('experienceLevel', option.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    className={`rounded-lg py-2.5 text-[13px] transition-colors ${
                      active
                        ? 'bg-gradient-to-br from-violet-500 to-purple-500 font-bold text-white'
                        : 'font-semibold text-ink-dim hover:text-ink'
                    }`}
                  >
                    {EXPERIENCE_LEVEL_SHORT_LABELS[option.value] ?? option.label}
                  </button>
                )
              })}
            </div>
            {errors.experienceLevel && (
              <p className="flex items-center gap-1.5 text-[13px] text-[#fb7185]" role="alert">
                {errors.experienceLevel.message}
              </p>
            )}
          </div>

          <SubmitButton isSubmitting={isSubmitting}>Create Account</SubmitButton>
        </form>

        <p className="mt-5.5 text-center text-sm text-[#8B8EA0]">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-violet-400 hover:text-[#C3A6FB]">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
