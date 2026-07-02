import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { loginSchema, type LoginInput } from '@mentorque/shared'
import { ApiError } from '../api/client'
import { DriftingBlobs } from '../components/layout/PageGlow'
import { FormBanner } from '../components/forms/FormBanner'
import { PasswordField } from '../components/forms/PasswordField'
import { SubmitButton } from '../components/forms/SubmitButton'
import { TextField } from '../components/forms/TextField'
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

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginInput) {
    setServerError(null)
    try {
      await login(values)
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

      <Link to="/" className="relative z-2 mt-16 mb-9 flex items-center gap-2.5">
        <LogoMark />
        <span className="font-display text-[19px] font-bold tracking-tight text-ink">MentorQ</span>
      </Link>

      <div className="animate-fade-up relative z-2 mb-15 w-full max-w-110 rounded-2xl border border-hairline bg-surface p-10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
        <h1 className="mb-2 font-display text-[26px] font-bold tracking-tight text-[#F9F9FC]">
          Welcome back
        </h1>
        <p className="mb-7.5 text-[14.5px] text-ink-dim">Log in to continue your interview prep.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4.5" noValidate>
          {serverError && <FormBanner variant="error" message={serverError} />}
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
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <SubmitButton isSubmitting={isSubmitting}>Log In</SubmitButton>
        </form>

        <p className="mt-6.5 text-center text-sm text-[#8B8EA0]">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-violet-400 hover:text-[#C3A6FB]">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}
