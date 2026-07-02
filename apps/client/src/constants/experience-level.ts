import type { ExperienceLevel } from '@mentorque/shared'

export const EXPERIENCE_LEVEL_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: 'ENTRY', label: 'Entry-level (0-2 years)' },
  { value: 'MID', label: 'Mid-level (2-5 years)' },
  { value: 'SENIOR', label: 'Senior (5-8 years)' },
  { value: 'LEAD', label: 'Lead / Staff (8+ years)' },
]
