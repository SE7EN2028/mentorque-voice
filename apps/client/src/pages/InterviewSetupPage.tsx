import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import type { z } from 'zod'
import { createSessionSchema, type InterviewType } from '@mentorque/shared'
import { ApiError } from '../api/client'
import { sessionsApi } from '../api/sessions'
import { uploadsApi } from '../api/uploads'
import { FormBanner } from '../components/forms/FormBanner'
import { SubmitButton } from '../components/forms/SubmitButton'
import { Sidebar } from '../components/layout/Sidebar'
import { INTERVIEW_TYPE_OPTIONS } from '../constants/interview-type'

const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024

// Mirrors createSessionSchema.jobDescriptionContext's real max (packages/shared/src/sessions/schemas.ts) —
// keep this in sync with that file, the schema doesn't expose the number for import.
const JOB_DESCRIPTION_MAX_LENGTH = 10_000

// resumeContext comes from the upload step, not a direct form field — reuse
// the shared schema rather than re-declaring the same constraints here.
const setupFormSchema = createSessionSchema.omit({ resumeContext: true })
type SetupFormValues = z.infer<typeof setupFormSchema>

const INTERVIEW_TYPE_META: Record<InterviewType, { description: string; icon: ReactNode }> = {
  BEHAVIORAL: {
    description: 'STAR-method questions on leadership and teamwork.',
    icon: (
      <path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.9 8.9 0 0 1-3.6-.8L3 20l1-4.5a8.4 8.4 0 0 1-1-4A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
    ),
  },
  TECHNICAL: {
    description: 'Coding and CS fundamentals with live follow-ups.',
    icon: (
      <>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </>
    ),
  },
  SYSTEM_DESIGN: {
    description: 'Architecture and scale discussions for senior roles.',
    icon: (
      <>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </>
    ),
  },
  HR_CULTURE_FIT: {
    description: 'Culture fit, motivation, and compensation talk.',
    icon: (
      <>
        <circle cx="9" cy="7" r="4" />
        <path d="M2.5 21c0-4 3-6.5 6.5-6.5s6.5 2.5 6.5 6.5" />
        <circle cx="17.5" cy="8" r="3" />
      </>
    ),
  },
}

function formatFileSize(bytes: number): string {
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export function InterviewSetupPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: { interviewType: 'BEHAVIORAL', jobDescriptionContext: '' },
  })

  const interviewType = watch('interviewType')
  const jobDescriptionContext = watch('jobDescriptionContext') ?? ''

  function selectInterviewType(value: InterviewType) {
    setValue('interviewType', value, { shouldValidate: true })
  }

  // Shared validator so click-to-browse and drag-and-drop both go through
  // the same file-selection logic.
  function validateAndSetFile(file: File | null) {
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

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    validateAndSetFile(event.target.files?.[0] ?? null)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragOver(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragOver(false)
    validateAndSetFile(event.dataTransfer.files?.[0] ?? null)
  }

  function handleRemoveFile() {
    setFileError(null)
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function triggerFileSelect() {
    fileInputRef.current?.click()
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
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />

      <main className="relative flex min-h-screen flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] bg-[radial-gradient(700px_280px_at_30%_0%,rgba(110,86,248,0.07),transparent_70%)]" />

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="relative z-10 flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto">
            <div className="animate-fade-up mx-auto max-w-[760px] px-10 pt-11 pb-15">
              <Link
                to="/dashboard"
                className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#8B8EA0] no-underline hover:text-ink"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to Dashboard
              </Link>

              <h1 className="font-display mb-2 text-[30px] font-bold tracking-tight text-[#F9F9FC]">
                Start New Interview
              </h1>
              <p className="mb-9 text-[15px] text-ink-dim">
                Configure your mock interview session — MentorQ tailors every question to what you
                set here.
              </p>

              {serverError && (
                <div className="mb-6">
                  <FormBanner variant="error" message={serverError} />
                </div>
              )}

              <div className="mb-3.5 text-[13px] font-bold tracking-[0.04em] text-[#75788A] uppercase">
                Interview Type
              </div>
              <div className="mb-9 grid grid-cols-4 gap-3.5">
                {INTERVIEW_TYPE_OPTIONS.map((option) => {
                  const isSelected = interviewType === option.value
                  const meta = INTERVIEW_TYPE_META[option.value]
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => selectInterviewType(option.value)}
                      className={`relative rounded-2xl px-4 py-5 text-left transition-colors ${
                        isSelected
                          ? 'border-[1.5px] border-violet-500 bg-violet-500/14 shadow-[0_0_0_4px_rgba(110,86,248,0.1)]'
                          : 'border-[1.5px] border-white/8 bg-surface hover:border-white/20'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#fff"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                      <div
                        className={`mb-3.5 flex h-9.5 w-9.5 items-center justify-center rounded-[10px] ${
                          isSelected ? 'bg-violet-500/22' : 'bg-white/5'
                        }`}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={isSelected ? '#B9A6FF' : '#9C9FB0'}
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {meta.icon}
                        </svg>
                      </div>
                      <div className="mb-1.5 text-[14.5px] font-bold text-ink">{option.label}</div>
                      <div
                        className={`text-xs leading-normal ${isSelected ? 'text-ink-dim' : 'text-[#75788A]'}`}
                      >
                        {meta.description}
                      </div>
                    </button>
                  )
                })}
              </div>
              {errors.interviewType && (
                <p role="alert" className="-mt-7 mb-9 text-sm text-red-400">
                  {errors.interviewType.message}
                </p>
              )}

              <div className="mb-3.5 text-[13px] font-bold tracking-[0.04em] text-[#75788A] uppercase">
                Resume Upload
              </div>
              <div className="mb-9">
                {selectedFile ? (
                  <div className="flex items-center justify-between rounded-2xl border-[1.5px] border-emerald-400/30 bg-emerald-400/[0.06] px-5 py-4.5">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-emerald-400/16">
                        <svg
                          width="19"
                          height="19"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#4ADE9C"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">
                          {selectedFile.name}
                        </div>
                        <div className="mt-0.5 text-xs text-[#75788A]">
                          {formatFileSize(selectedFile.size)} · Ready to use
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      aria-label="Remove selected resume file"
                      className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-white/6 text-[#C7C9D6] hover:bg-white/12"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      >
                        <line x1="6" y1="6" x2="18" y2="18" />
                        <line x1="18" y1="6" x2="6" y2="18" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={triggerFileSelect}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        triggerFileSelect()
                      }
                    }}
                    className={`flex cursor-pointer flex-col items-center rounded-2xl border-[1.75px] border-dashed px-6 py-9.5 text-center transition-colors ${
                      isDragOver
                        ? 'border-violet-500 bg-violet-500/[0.08]'
                        : 'border-white/14 bg-white/[0.015] hover:border-white/20'
                    }`}
                  >
                    <div className="mb-4 flex h-11.5 w-11.5 items-center justify-center rounded-xl bg-violet-500/14">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#9E8CFB"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 18a4.6 4.4 0 0 1-1.3-8.6 5 5 0 0 1 9.6-2 4.5 4.5 0 0 1 5.7 4.3A4 4 0 0 1 20 18H7z" />
                        <polyline points="8.5 16.5 12 13 15.5 16.5" />
                        <line x1="12" y1="13" x2="12" y2="21.5" />
                      </svg>
                    </div>
                    <div className="mb-1.5 text-[15px] font-semibold text-ink">
                      Drag &amp; drop your resume here
                    </div>
                    <div className="text-[13px] text-[#75788A]">
                      or click to browse — PDF up to 5MB
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                )}
                {fileError && (
                  <p role="alert" className="mt-2 text-sm text-red-400">
                    {fileError}
                  </p>
                )}
              </div>

              <div className="mb-3.5 text-[13px] font-bold tracking-[0.04em] text-[#75788A] uppercase">
                Job Description
              </div>
              <div className="mb-9">
                <div className="relative">
                  <textarea
                    id="jobDescriptionContext"
                    rows={6}
                    placeholder="Paste the job description here so MentorQ can tailor questions to this specific role…"
                    className="block w-full resize-y rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-4 text-[14.5px] leading-[1.6] text-ink outline-none placeholder:text-[#5C5F70] focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(110,86,248,0.16)]"
                    {...register('jobDescriptionContext')}
                  />
                  <div className="pointer-events-none absolute right-3.5 bottom-3 text-[11.5px] text-[#4A4D5C]">
                    {jobDescriptionContext.length}/{JOB_DESCRIPTION_MAX_LENGTH}
                  </div>
                </div>
                {errors.jobDescriptionContext && (
                  <p role="alert" className="mt-1.5 text-sm text-red-400">
                    {errors.jobDescriptionContext.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-[15] flex justify-center border-t border-hairline bg-canvas/78 px-10 py-4.5 backdrop-blur-[14px]">
            <div className="flex w-full max-w-[760px] items-center justify-end gap-5">
              <SubmitButton
                isSubmitting={isSubmitting}
                className="inline-flex w-auto shrink-0 items-center gap-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 px-7.5 py-[15px] text-[15.5px] font-bold text-white shadow-[0_10px_28px_-8px_rgba(110,86,248,0.55)] transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Start Interview
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </SubmitButton>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
