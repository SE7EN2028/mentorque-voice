import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { signupSchema, type SignupInput } from '@mentorque/shared'
import { ApiError } from '../api/client'
import { FormBanner } from '../components/forms/FormBanner'
import { SelectField } from '../components/forms/SelectField'
import { SubmitButton } from '../components/forms/SubmitButton'
import { TextField } from '../components/forms/TextField'
import { EXPERIENCE_LEVEL_OPTIONS } from '../constants/experience-level'
import { useAuth } from '../context/AuthContext'

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold text-white">Create your account</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {serverError && <FormBanner variant="error" message={serverError} />}
          <TextField
            label="Name"
            autoComplete="name"
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <TextField
            label="Target job role"
            placeholder="e.g. Frontend Engineer"
            error={errors.jobRole?.message}
            {...register('jobRole')}
          />
          <SelectField
            label="Experience level"
            options={EXPERIENCE_LEVEL_OPTIONS}
            error={errors.experienceLevel?.message}
            {...register('experienceLevel')}
          />
          <SubmitButton isSubmitting={isSubmitting}>Create account</SubmitButton>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
