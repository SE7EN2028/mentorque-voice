import type { InterviewType } from '@mentorque/shared'

export const INTERVIEW_TYPE_OPTIONS: { value: InterviewType; label: string }[] = [
  { value: 'BEHAVIORAL', label: 'Behavioral' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'SYSTEM_DESIGN', label: 'System Design' },
  { value: 'HR_CULTURE_FIT', label: 'HR / Culture Fit' },
]

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  BEHAVIORAL: 'Behavioral',
  TECHNICAL: 'Technical',
  SYSTEM_DESIGN: 'System Design',
  HR_CULTURE_FIT: 'HR / Culture Fit',
}
