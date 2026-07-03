import type { TurnAction } from '@mentorque/shared'
import type { InterviewBlueprint } from '../blueprints/types.js'
import type { LLMProvider } from '../llm/llm-provider.js'
import { promptBuilder } from '../prompt-builder/prompt-builder.js'
import { turnResponseSchema, type TurnResponse } from '../prompt-builder/response-schema.js'
import type { EngineState } from '../types/engine-state.js'
import type { AnswerEvaluation } from '../types/evaluation.js'
import type { EngineTranscriptTurn } from '../types/transcript.js'
import { computeNextDifficulty } from './difficulty-controller.js'
import { applyGuardrails } from './guardrails.js'
import { applyMemoryUpdates, buildProgress, resolveTopic } from './memory.js'

export interface ProcessTurnInput {
  blueprint: InterviewBlueprint
  state: EngineState
  recentTranscript: EngineTranscriptTurn[]
  /** null only for the very first turn (the opening) — no candidate answer
   * exists yet to respond to. */
  candidateMessage: string | null
  elapsedMs: number
  /** True when the candidate explicitly asked to end early via /end. */
  forceConclude?: boolean
}

export interface ProcessTurnResult {
  assistantMessage: string
  action: TurnAction
  difficulty: number
  /** null on the opening turn — there was no candidate answer to evaluate. */
  evaluation: AnswerEvaluation | null
  newState: EngineState
  isSessionOver: boolean
  progress: ReturnType<typeof buildProgress>
}

/**
 * The orchestrator. Pure business logic — no Express, no Prisma, no
 * knowledge of Gemini specifically. Given the same LLMProvider response it
 * always transitions state the same way, which is what makes the guardrail
 * and memory logic unit-testable with a scripted fake provider.
 *
 * Response shape validation (and the retry-once-on-invalid-output policy)
 * happens inside the injected LLMProvider via the `validate` callback below
 * — not here. That keeps "what counts as valid" (the Zod schema) owned by
 * the engine while the retry mechanics live in a provider-agnostic
 * decorator any LLMProvider benefits from, Gemini or otherwise.
 */
export async function processTurn(
  input: ProcessTurnInput,
  llmProvider: LLMProvider,
): Promise<ProcessTurnResult> {
  const forceConclude = input.forceConclude ?? false
  const state: EngineState = { ...input.state, elapsedMs: input.elapsedMs }

  const prompt = promptBuilder.build({
    blueprint: input.blueprint,
    state,
    recentTranscript: input.recentTranscript,
    candidateMessage: input.candidateMessage,
    forceConclude,
  })

  const response = await llmProvider.generateStructured<TurnResponse>({
    systemInstruction: prompt.systemInstruction,
    messages: prompt.messages,
    responseSchema: prompt.responseSchema,
    validate: (value) => turnResponseSchema.safeParse(value),
  })

  const topicCompletedThisTurn = resolveTopic(
    response.memoryUpdates.topicCompleted,
    input.blueprint,
  )

  const guardrailResult = applyGuardrails({
    proposedAction: response.decision.action,
    state,
    blueprint: input.blueprint,
    forceConclude,
    topicCompletedThisTurn,
  })

  const nextDifficulty = computeNextDifficulty(
    response.decision.difficulty,
    state.currentDifficulty,
    input.candidateMessage === null ? null : response.evaluation,
  )

  const nextMemory = applyMemoryUpdates(
    state.memory,
    response.memoryUpdates,
    guardrailResult.action,
    input.blueprint,
  )

  const isSessionOver = guardrailResult.action === 'CONCLUDE'
  const staysOnTopic =
    guardrailResult.action === 'FOLLOW_UP' ||
    guardrailResult.action === 'PROBE' ||
    guardrailResult.action === 'CHALLENGE'

  const newState: EngineState = {
    ...state,
    stage: isSessionOver ? 'closing' : 'active',
    currentDifficulty: nextDifficulty,
    followUpCountOnCurrentTopic: staysOnTopic ? state.followUpCountOnCurrentTopic + 1 : 0,
    questionsAskedCount: state.questionsAskedCount + 1,
    memory: nextMemory,
  }

  // A guardrail-forced CONCLUDE (candidate ended the interview, time cap
  // hit) usually lands while the model proposed another question — speaking
  // that question and then hanging up is broken. Substitute a deterministic
  // closing line; every other override keeps the model's text.
  const assistantMessage =
    isSessionOver && response.decision.action !== 'CONCLUDE'
      ? 'Thank you for your time today — that wraps up our interview. Your feedback report will be ready shortly.'
      : response.assistantResponse

  return {
    assistantMessage,
    action: guardrailResult.action,
    difficulty: nextDifficulty,
    evaluation: input.candidateMessage === null ? null : response.evaluation,
    newState,
    isSessionOver,
    progress: buildProgress(newState, input.blueprint),
  }
}
