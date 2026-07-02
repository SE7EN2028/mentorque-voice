import type { TurnAction } from '@mentorque/shared'
import type { InterviewBlueprint } from '../blueprints/types.js'
import type { EngineState } from '../types/engine-state.js'

const MAX_FOLLOW_UPS_PER_TOPIC = 3
const DIGGING_ACTIONS: TurnAction[] = ['FOLLOW_UP', 'PROBE', 'CHALLENGE']

export interface GuardrailInput {
  proposedAction: TurnAction
  state: EngineState
  blueprint: InterviewBlueprint
  forceConclude: boolean
  /** The topic the model just marked done THIS turn (memoryUpdates.topicCompleted),
   * if any — not yet reflected in state.memory.completedTopics, since that
   * only gets applied after guardrails run. Without folding this in, a
   * model that completes the last required topic and proposes CONCLUDE in
   * the same turn gets incorrectly bounced to ADVANCE_TOPIC, one turn late. */
  topicCompletedThisTurn: string | null
}

export interface GuardrailResult {
  action: TurnAction
  /** Non-null only when a guardrail overrode the model's proposed action —
   * kept for logging/debugging, never shown to the candidate. */
  overrideReason: string | null
}

function requiredTopicsRemaining(
  state: EngineState,
  blueprint: InterviewBlueprint,
  topicCompletedThisTurn: string | null,
): string[] {
  return blueprint.requiredTopics.filter(
    (topic) => topic !== topicCompletedThisTurn && !state.memory.completedTopics.includes(topic),
  )
}

/**
 * Deterministic checks with final authority over the model's proposed
 * action — the model decides the qualitative "what feels right," these
 * enforce the hard limits that must never depend on the model getting it
 * right on every single turn.
 */
export function applyGuardrails({
  proposedAction,
  state,
  blueprint,
  forceConclude,
  topicCompletedThisTurn,
}: GuardrailInput): GuardrailResult {
  if (forceConclude) {
    return { action: 'CONCLUDE', overrideReason: 'candidate asked to end the interview' }
  }

  if (state.elapsedMs >= state.maxDurationMs) {
    return { action: 'CONCLUDE', overrideReason: 'max interview duration reached' }
  }

  const remaining = requiredTopicsRemaining(state, blueprint, topicCompletedThisTurn)

  if (
    DIGGING_ACTIONS.includes(proposedAction) &&
    state.followUpCountOnCurrentTopic >= MAX_FOLLOW_UPS_PER_TOPIC
  ) {
    return {
      action: remaining.length > 0 ? 'ADVANCE_TOPIC' : 'CONCLUDE',
      overrideReason: 'max follow-ups on this topic reached',
    }
  }

  if (proposedAction === 'CONCLUDE' && remaining.length > 0) {
    return { action: 'ADVANCE_TOPIC', overrideReason: 'required topics remain uncovered' }
  }

  return { action: proposedAction, overrideReason: null }
}
