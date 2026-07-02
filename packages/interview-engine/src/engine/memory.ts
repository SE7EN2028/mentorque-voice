import type { ExperienceLevel, InterviewType, TurnAction } from '@mentorque/shared'
import type { InterviewBlueprint } from '../blueprints/types.js'
import type { TurnResponse } from '../prompt-builder/response-schema.js'
import type { ConversationMemory, EngineState } from '../types/engine-state.js'

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values))
}

/**
 * Validates a topic string the model claims (topicCompleted/nextTopic)
 * against the blueprint's actual topic list before trusting it — despite
 * the prompt instructing "use the exact topic string, verbatim," a model
 * can still paraphrase. An exact match is used as-is; a case/whitespace
 * variant snaps to the blueprint's canonical string (avoids near-duplicate
 * entries in completedTopics); anything else is dropped rather than
 * corrupting state with a topic that doesn't correspond to real coverage.
 */
export function resolveTopic(
  candidate: string | null,
  blueprint: InterviewBlueprint,
): string | null {
  if (!candidate) return null

  const allTopics = [...blueprint.requiredTopics, ...blueprint.optionalTopics]
  if (allTopics.includes(candidate)) return candidate

  const normalized = candidate.trim().toLowerCase()
  return allTopics.find((topic) => topic.trim().toLowerCase() === normalized) ?? null
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

  const resolvedTopicCompleted = resolveTopic(updates.topicCompleted, blueprint)
  const resolvedNextTopic = resolveTopic(updates.nextTopic, blueprint)

  if (resolvedTopicCompleted && !completedTopics.includes(resolvedTopicCompleted)) {
    completedTopics = [...completedTopics, resolvedTopicCompleted]
  }

  if (finalAction === 'ADVANCE_TOPIC') {
    if (currentTopic && !completedTopics.includes(currentTopic)) {
      completedTopics = [...completedTopics, currentTopic]
    }
    const nextMemory = { ...memory, completedTopics }
    currentTopic = resolvedNextTopic ?? pickFallbackTopic(blueprint, nextMemory)
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
