import type { InterviewType } from '@mentorque/shared'
import { behavioralBlueprint } from './behavioral.js'
import { hrCultureFitBlueprint } from './hr-culture-fit.js'
import { systemDesignBlueprint } from './system-design.js'
import { technicalBlueprint } from './technical.js'
import type { InterviewBlueprint } from './types.js'

const BLUEPRINTS: Record<InterviewType, InterviewBlueprint> = {
  BEHAVIORAL: behavioralBlueprint,
  TECHNICAL: technicalBlueprint,
  SYSTEM_DESIGN: systemDesignBlueprint,
  HR_CULTURE_FIT: hrCultureFitBlueprint,
}

export function getBlueprint(interviewType: InterviewType): InterviewBlueprint {
  return BLUEPRINTS[interviewType]
}

export * from './types.js'
