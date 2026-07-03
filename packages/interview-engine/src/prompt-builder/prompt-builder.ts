import type { InterviewBlueprint } from '../blueprints/types.js'
import type { LLMMessage } from '../llm/llm-provider.js'
import type { EngineState } from '../types/engine-state.js'
import type { EngineTranscriptTurn } from '../types/transcript.js'
import { TURN_RESPONSE_JSON_SCHEMA } from './response-schema.js'

const RECENT_TRANSCRIPT_TURN_LIMIT = 6

export interface PromptContext {
  blueprint: InterviewBlueprint
  state: EngineState
  recentTranscript: EngineTranscriptTurn[]
  candidateMessage: string | null
  /** True only when the candidate explicitly asked to end early — tells the
   * model to wrap up warmly instead of asking another question. */
  forceConclude: boolean
}

export interface BuiltPrompt {
  systemInstruction: string
  messages: LLMMessage[]
  responseSchema: typeof TURN_RESPONSE_JSON_SCHEMA
}

function buildSystemInstruction(
  blueprint: InterviewBlueprint,
  state: EngineState,
  forceConclude: boolean,
): string {
  const { memory } = state
  const requiredRemaining = blueprint.requiredTopics.filter(
    (topic) => !memory.completedTopics.includes(topic),
  )

  const lines = [
    `You are conducting a live ${blueprint.label} interview. This is a real, dynamic conversation — never a fixed questionnaire.`,
    `Interviewer personality: ${blueprint.interviewerPersonality}`,
    '',
    'RULES — follow exactly:',
    '- Ask exactly ONE question or make ONE remark per turn — this is a hard limit, not a preference. If you find yourself writing "and", "also", or a second question mark in assistantResponse, stop and cut it down to a single question before responding. A real interviewer never fires off a list of three questions at once.',
    '- Never re-ask a topic already in "Completed topics" below.',
    "- Actually process the candidate's last answer before deciding what to do next — react to the specific thing they said, never give a generic response that could apply to any answer.",
    '- Follow up (action FOLLOW_UP) when an answer is incomplete or something they said is worth digging into.',
    '- Probe (action PROBE) when an answer is vague or you suspect shallow understanding.',
    "- Challenge (action CHALLENGE) strong answers sometimes — push back, play devil's advocate, a real interviewer does not just nod along.",
    '- Advance (action ADVANCE_TOPIC) once the current topic feels sufficiently explored, usually after 1-3 exchanges. Set memoryUpdates.nextTopic to the exact next topic string, AND make assistantResponse actually transition to that new topic — never advance the decision while still asking about the topic you just left.',
    '- Conclude (action CONCLUDE) only once required topics are covered and there is a natural stopping point.',
    '- When setting memoryUpdates.topicCompleted or memoryUpdates.nextTopic, use the EXACT topic string from the topics lists below, verbatim — not a paraphrase.',
    "- decision.difficulty is your proposal for the next question's difficulty (1-5) — deterministic guardrails outside your control may adjust it.",
    '- assistantResponse must contain ONLY what you would actually say out loud to the candidate. No stage directions, no meta-commentary, no markdown.',
    '',
    `Required topics: ${blueprint.requiredTopics.join(' | ')}`,
    `Completed topics: ${memory.completedTopics.join(' | ') || 'none yet'}`,
    `Still required: ${requiredRemaining.join(' | ') || 'none — all required topics covered'}`,
    `Optional topics (use if time allows): ${blueprint.optionalTopics.join(' | ')}`,
    '',
    `Evaluate ONLY these dimensions for this interview type, set every other dimension to null: ${blueprint.evaluationCriteria.join(', ')}`,
    '',
    `Candidate: ${memory.candidateProfile.name}, targeting ${memory.candidateProfile.jobRole} (${memory.candidateProfile.experienceLevel} level)`,
    memory.resumeContext ? `Resume highlights: ${memory.resumeContext}` : null,
    memory.jobDescriptionContext ? `Job description: ${memory.jobDescriptionContext}` : null,
    '',
    `Current difficulty: ${state.currentDifficulty}/5`,
    `Current topic: ${memory.currentTopic ?? 'not yet started'}`,
    `Technologies mentioned so far: ${memory.technologiesMentioned.join(', ') || 'none yet'}`,
    `Strengths observed: ${memory.strengthsObserved.join(', ') || 'none yet'}`,
    `Weaknesses observed: ${memory.weaknessesObserved.join(', ') || 'none yet'}`,
    `Unresolved follow-ups: ${memory.unresolvedFollowUps.join(', ') || 'none'}`,
  ]

  if (state.stage === 'opening') {
    lines.push(
      '',
      'This is the very start of the interview — there is no candidate answer yet. Briefly greet the candidate by name and state what this interview covers, then ask your first question about one of the required topics. You have no name of your own — never introduce yourself with one, and never write a placeholder like "[Interviewer Name]" or "[Your Name]". Set evaluation fields to null, decision.action to ADVANCE_TOPIC, and memoryUpdates.nextTopic to the exact topic you are starting with.',
    )
  }

  if (forceConclude) {
    lines.push(
      '',
      'The candidate has asked to end the interview now. Give a brief, warm closing remark — thank them for their time. Do not ask another question. Set decision.action to CONCLUDE.',
    )
  }

  lines.push('', 'Respond ONLY with the structured JSON matching the required schema.')

  return lines.filter((line): line is string => line !== null).join('\n')
}

function buildMessages(
  recentTranscript: EngineTranscriptTurn[],
  candidateMessage: string | null,
): LLMMessage[] {
  const trimmed = recentTranscript.slice(-RECENT_TRANSCRIPT_TURN_LIMIT)
  const messages: LLMMessage[] = trimmed.map((turn) => ({
    role: turn.role === 'CANDIDATE' ? 'user' : 'assistant',
    content: turn.content,
  }))

  messages.push({
    role: 'user',
    content: candidateMessage ?? '[The interview is starting. Begin.]',
  })

  return messages
}

/**
 * The engine's only route to a prompt — it never assembles system text or
 * message arrays itself. Given the same inputs, this always produces the
 * same prompt shape, independent of which LLMProvider ends up consuming it.
 */
export const promptBuilder = {
  build(context: PromptContext): BuiltPrompt {
    return {
      systemInstruction: buildSystemInstruction(
        context.blueprint,
        context.state,
        context.forceConclude,
      ),
      messages: buildMessages(context.recentTranscript, context.candidateMessage),
      responseSchema: TURN_RESPONSE_JSON_SCHEMA,
    }
  },
}
