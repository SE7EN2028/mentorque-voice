import { useState, type ChangeEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import type { z } from 'zod'
import { createSessionSchema } from '@mentorque/shared'
import { ApiError } from '../api/client'
import { sessionsApi } from '../api/sessions'
import { uploadsApi } from '../api/uploads'
import { FormBanner } from '../components/forms/FormBanner'
import { SelectField } from '../components/forms/SelectField'
import { SubmitButton } from '../components/forms/SubmitButton'
import { INTERVIEW_TYPE_OPTIONS } from '../constants/interview-type'

const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024

// resumeContext comes from the upload step, not a direct form field — reuse
// the shared schema rather than re-declaring the same constraints here.
const setupFormSchema = createSessionSchema.omit({ resumeContext: true })
type SetupFormValues = z.infer<typeof setupFormSchema>

export function InterviewSetupPage() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: { interviewType: 'BEHAVIORAL', jobDescriptionContext: '' },
  })

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setFileError(null)

    if (!file) {
      setSelectedFile(null)
      return
    }
    if (file.type !== 'application/pdf') {
      setFileError('Please choose a PDF file')
      setSelectedFile(null)
      return
    }
    if (file.size > MAX_RESUME_FILE_BYTES) {
      setFileError('File is too large (max 5MB)')
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
  }

  async function onSubmit(values: SetupFormValues) {
    setServerError(null)
    setIsSubmitting(true)
    try {
      const resumeContext = selectedFile ? await uploadsApi.uploadResume(selectedFile) : undefined

      const session = await sessionsApi.create({
        interviewType: values.interviewType,
        resumeContext,
        jobDescriptionContext: values.jobDescriptionContext?.trim() || undefined,
      })

      navigate(`/sessions/${session.id}`, { replace: true })
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      )
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
      <div className="w-full max-w-lg">
        <h1 className="mb-6 text-center text-2xl font-semibold text-white">
          Set up your interview
        </h1>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {serverError && <FormBanner variant="error" message={serverError} />}

          <SelectField
            label="Interview type"
            options={INTERVIEW_TYPE_OPTIONS}
            error={errors.interviewType?.message}
            {...register('interviewType')}
          />

          <div className="flex flex-col gap-1.5 text-left">
            <label htmlFor="resume" className="text-sm font-medium text-slate-300">
              Resume (PDF, optional)
            </label>
            <input
              id="resume"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-sm file:text-slate-200 hover:file:bg-slate-700"
            />
            {selectedFile && <p className="text-sm text-slate-400">{selectedFile.name}</p>}
            {fileError && (
              <p className="text-sm text-red-400" role="alert">
                {fileError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label htmlFor="jobDescriptionContext" className="text-sm font-medium text-slate-300">
              Job description (optional)
            </label>
            <textarea
              id="jobDescriptionContext"
              rows={5}
              placeholder="Paste the job description here"
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
              {...register('jobDescriptionContext')}
            />
            {errors.jobDescriptionContext && (
              <p className="text-sm text-red-400" role="alert">
                {errors.jobDescriptionContext.message}
              </p>
            )}
          </div>

          <SubmitButton isSubmitting={isSubmitting}>Start interview</SubmitButton>
        </form>
      </div>
    </main>
  )
}
