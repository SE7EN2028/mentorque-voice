import type { TurnAction } from '@mentorque/shared'
import type { InterviewBlueprint } from '../blueprints/types.js'
import type { LLMProvider } from '../llm/llm-provider.js'
import { promptBuilder } from '../prompt-builder/prompt-builder.js'
import { turnResponseSchema } from '../prompt-builder/response-schema.js'
import type { EngineState } from '../types/engine-state.js'
import type { AnswerEvaluation } from '../types/evaluation.js'
import type { EngineTranscriptTurn } from '../types/transcript.js'
import { computeNextDifficulty } from './difficulty-controller.js'
import { EngineResponseValidationError } from './errors.js'
import { applyGuardrails } from './guardrails.js'
import { applyMemoryUpdates, buildProgress } from './memory.js'

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

  const rawResponse = await llmProvider.generateStructured<unknown>({
    systemInstruction: prompt.systemInstruction,
    messages: prompt.messages,
    responseSchema: prompt.responseSchema,
  })

  const parsed = turnResponseSchema.safeParse(rawResponse)
  if (!parsed.success) {
    throw new EngineResponseValidationError(
      'Model response did not match the expected turn schema',
      parsed.error,
    )
  }
  const response = parsed.data

  const guardrailResult = applyGuardrails({
    proposedAction: response.decision.action,
    state,
    blueprint: input.blueprint,
    forceConclude,
    topicCompletedThisTurn: response.memoryUpdates.topicCompleted,
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

  return {
    assistantMessage: response.assistantResponse,
    action: guardrailResult.action,
    difficulty: nextDifficulty,
    evaluation: input.candidateMessage === null ? null : response.evaluation,
    newState,
    isSessionOver,
    progress: buildProgress(newState, input.blueprint),
  }
}
