import type { ExperienceLevel, InterviewType, TurnAction } from '@mentorque/shared'
import type { InterviewBlueprint } from '../blueprints/types.js'
import type { TurnResponse } from '../prompt-builder/response-schema.js'
import type { ConversationMemory, EngineState } from '../types/engine-state.js'

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values))
}

/** Deterministic fallback for when a guardrail forces ADVANCE_TOPIC but the
 * model (having proposed something else entirely) never set nextTopic —
 * without this the conversation would silently lose track of what topic
 * it's on. Picks the next uncovered required topic, then optional, then
 * null (all covered — the next guardrail check will move to CONCLUDE). */
function pickFallbackTopic(
  blueprint: InterviewBlueprint,
  memory: ConversationMemory,
): string | null {
  const nextRequired = blueprint.requiredTopics.find(
    (topic) => !memory.completedTopics.includes(topic),
  )
  if (nextRequired) return nextRequired

  const nextOptional = blueprint.optionalTopics.find(
    (topic) => !memory.completedTopics.includes(topic),
  )
  return nextOptional ?? null
}

export function applyMemoryUpdates(
  memory: ConversationMemory,
  updates: TurnResponse['memoryUpdates'],
  finalAction: TurnAction,
  blueprint: InterviewBlueprint,
): ConversationMemory {
  const technologiesMentioned = dedupe([
    ...memory.technologiesMentioned,
    ...updates.newTechnologies,
  ])
  const projectsMentioned = updates.newProject
    ? [...memory.projectsMentioned, updates.newProject]
    : memory.projectsMentioned
  const strengthsObserved = updates.newStrength
    ? dedupe([...memory.strengthsObserved, updates.newStrength])
    : memory.strengthsObserved
  const weaknessesObserved = updates.newWeakness
    ? dedupe([...memory.weaknessesObserved, updates.newWeakness])
    : memory.weaknessesObserved

  let completedTopics = memory.completedTopics
  let currentTopic = memory.currentTopic

  if (updates.topicCompleted && !completedTopics.includes(updates.topicCompleted)) {
    completedTopics = [...completedTopics, updates.topicCompleted]
  }

  if (finalAction === 'ADVANCE_TOPIC') {
    if (currentTopic && !completedTopics.includes(currentTopic)) {
      completedTopics = [...completedTopics, currentTopic]
    }
    const nextMemory = { ...memory, completedTopics }
    currentTopic = updates.nextTopic ?? pickFallbackTopic(blueprint, nextMemory)
  }

  let unresolvedFollowUps = memory.unresolvedFollowUps
  if (updates.followUpResolved) {
    unresolvedFollowUps = unresolvedFollowUps.filter((item) => item !== updates.followUpResolved)
  }
  if (updates.flagUnresolved && !unresolvedFollowUps.includes(updates.flagUnresolved)) {
    unresolvedFollowUps = [...unresolvedFollowUps, updates.flagUnresolved]
  }

  return {
    ...memory,
    technologiesMentioned,
    projectsMentioned,
    strengthsObserved,
    weaknessesObserved,
    completedTopics,
    currentTopic,
    unresolvedFollowUps,
  }
}

export function createInitialEngineState(params: {
  interviewType: InterviewType
  candidateProfile: { name: string; jobRole: string; experienceLevel: ExperienceLevel }
  resumeContext: string | null
  jobDescriptionContext: string | null
  maxDurationMs: number
}): EngineState {
  return {
    stage: 'opening',
    interviewType: params.interviewType,
    currentDifficulty: 3,
    followUpCountOnCurrentTopic: 0,
    questionsAskedCount: 0,
    startedAt: null,
    elapsedMs: 0,
    maxDurationMs: params.maxDurationMs,
    memory: {
      candidateProfile: params.candidateProfile,
      resumeContext: params.resumeContext,
      jobDescriptionContext: params.jobDescriptionContext,
      technologiesMentioned: [],
      projectsMentioned: [],
      strengthsObserved: [],
      weaknessesObserved: [],
      completedTopics: [],
      currentTopic: null,
      unresolvedFollowUps: [],
    },
  }
}

export function buildProgress(state: EngineState, blueprint: InterviewBlueprint) {
  return {
    stage: state.stage,
    questionsAskedCount: state.questionsAskedCount,
    requiredTopicsCovered: blueprint.requiredTopics.filter((topic) =>
      state.memory.completedTopics.includes(topic),
    ).length,
    requiredTopicsTotal: blueprint.requiredTopics.length,
    currentTopic: state.memory.currentTopic,
    elapsedMs: state.elapsedMs,
    maxDurationMs: state.maxDurationMs,
  }
}
