/**
 * Demonstrates the conversation engine's orchestration logic — guardrails,
 * difficulty control, memory accumulation, natural conclusion — against a
 * SCRIPTED fake LLMProvider rather than live Gemini. This is deliberate:
 * it proves the engine's deterministic behavior (does the follow-up cap
 * actually trigger? does difficulty really refuse to rise on a weak
 * answer? does memory actually accumulate?) independently of any one
 * model's non-deterministic output quality. Run with `npm run demo`.
 */
import assert from 'node:assert/strict'
import type { InterviewType, TurnAction } from '@mentorque/shared'
import {
  createInitialEngineState,
  getBlueprint,
  processTurn,
  type EngineTranscriptTurn,
  type LLMProvider,
} from '../src/index.js'

class ScriptedLLMProvider implements LLMProvider {
  private index = 0
  constructor(private readonly script: unknown[]) {}

  async generateStructured<T>(): Promise<T> {
    if (this.index >= this.script.length) {
      throw new Error('ScriptedLLMProvider ran out of scripted responses')
    }
    const response = this.script[this.index]
    this.index += 1
    return response as T
  }
}

interface ScriptedTurnOptions {
  action: TurnAction
  difficulty: number
  evaluation?: Partial<{
    relevance: number | null
    completeness: number | null
    technicalAccuracy: number | null
    problemSolving: number | null
    depthOfKnowledge: number | null
    communication: number | null
    confidence: number | null
    starStructure: number | null
  }>
  memoryUpdates?: Partial<{
    newTechnologies: string[]
    newProject: { name: string; summary: string } | null
    newStrength: string | null
    newWeakness: string | null
    topicCompleted: string | null
    nextTopic: string | null
    flagUnresolved: string | null
    followUpResolved: string | null
  }>
  assistantResponse: string
}

function scripted(opts: ScriptedTurnOptions) {
  return {
    reasoning: 'scripted for demo purposes',
    evaluation: {
      relevance: null,
      completeness: null,
      technicalAccuracy: null,
      problemSolving: null,
      depthOfKnowledge: null,
      communication: null,
      confidence: null,
      starStructure: null,
      ...opts.evaluation,
    },
    decision: { action: opts.action, difficulty: opts.difficulty },
    memoryUpdates: {
      newTechnologies: [],
      newProject: null,
      newStrength: null,
      newWeakness: null,
      topicCompleted: null,
      nextTopic: null,
      flagUnresolved: null,
      followUpResolved: null,
      ...opts.memoryUpdates,
    },
    assistantResponse: opts.assistantResponse,
  }
}

interface ScriptedTurn {
  candidateMessage: string | null
  response: ReturnType<typeof scripted>
}

async function runScenario(name: string, interviewType: InterviewType, turns: ScriptedTurn[]) {
  console.log(`\n=== ${name} (${interviewType}) ===`)
  const blueprint = getBlueprint(interviewType)

  let state = createInitialEngineState({
    interviewType,
    candidateProfile: {
      name: 'Jordan Rivera',
      jobRole: 'Backend Engineer',
      experienceLevel: 'MID',
    },
    resumeContext: null,
    jobDescriptionContext: null,
    maxDurationMs: blueprint.expectedDurationMinutes * 60_000,
  })
  const recentTranscript: EngineTranscriptTurn[] = []
  let elapsedMs = 0
  const results = []

  for (const turn of turns) {
    const provider = new ScriptedLLMProvider([turn.response])
    const result = await processTurn(
      { blueprint, state, recentTranscript, candidateMessage: turn.candidateMessage, elapsedMs },
      provider,
    )

    if (turn.candidateMessage) {
      console.log(`Candidate:   ${turn.candidateMessage}`)
      recentTranscript.push({ role: 'CANDIDATE', content: turn.candidateMessage })
    }
    console.log(
      `Interviewer [${result.action}, difficulty ${result.difficulty}]: ${result.assistantMessage}`,
    )
    recentTranscript.push({ role: 'INTERVIEWER', content: result.assistantMessage })

    state = result.newState
    elapsedMs += 90_000 // simulate ~90s per exchange
    results.push(result)

    if (result.isSessionOver) {
      console.log('--- interview concluded ---')
      break
    }
  }

  return { finalState: state, results }
}

async function excellentCandidateScenario() {
  const blueprint = getBlueprint('TECHNICAL')
  const [topic1, topic2, topic3] = blueprint.requiredTopics

  const { finalState, results } = await runScenario('Excellent candidate', 'TECHNICAL', [
    {
      candidateMessage: null,
      response: scripted({
        action: 'ADVANCE_TOPIC',
        difficulty: 3,
        memoryUpdates: { nextTopic: topic1 },
        assistantResponse:
          "Hi, I'm your interviewer today. Let's start — tell me about the language or framework you know best.",
      }),
    },
    {
      candidateMessage:
        'I know Node.js and TypeScript deeply — I built a payments service handling 10k req/s, using worker threads for CPU-bound validation and careful backpressure handling on the queue.',
      response: scripted({
        evaluation: {
          relevance: 9,
          completeness: 8,
          technicalAccuracy: 9,
          depthOfKnowledge: 9,
          communication: 8,
        },
        action: 'CHALLENGE',
        difficulty: 4,
        memoryUpdates: {
          newTechnologies: ['Node.js', 'TypeScript'],
          newStrength: 'deep async/concurrency knowledge',
        },
        assistantResponse:
          'Strong answer. But what happens to that backpressure handling if the downstream queue consumer dies mid-batch?',
      }),
    },
    {
      candidateMessage:
        'We use idempotency keys and at-least-once delivery — the consumer replays from the last committed offset, and writes are deduped by key, so a mid-batch crash just means some redundant work, not data loss.',
      response: scripted({
        evaluation: {
          relevance: 9,
          completeness: 9,
          technicalAccuracy: 9,
          depthOfKnowledge: 9,
          communication: 9,
        },
        action: 'ADVANCE_TOPIC',
        difficulty: 4,
        memoryUpdates: { topicCompleted: topic1, nextTopic: topic2, newTechnologies: ['Kafka'] },
        assistantResponse:
          "Good — that's exactly the right instinct. Let's shift: walk me through how you generally approach an unfamiliar bug in production.",
      }),
    },
    {
      candidateMessage:
        'I reproduce locally first if possible, add structured logging around the suspected boundary, and use bisection — comment out half the suspect code path — rather than guessing.',
      response: scripted({
        evaluation: { relevance: 9, completeness: 8, problemSolving: 9, communication: 8 },
        action: 'ADVANCE_TOPIC',
        difficulty: 5,
        memoryUpdates: { topicCompleted: topic2, nextTopic: topic3 },
        assistantResponse:
          'Solid methodology. Last one: tell me about a real performance issue you diagnosed and fixed.',
      }),
    },
    {
      candidateMessage:
        'A report endpoint was doing N+1 queries under load. I profiled with EXPLAIN ANALYZE, found the missing index, and added a batched loader — p99 went from 4s to 80ms.',
      response: scripted({
        evaluation: {
          relevance: 9,
          completeness: 9,
          technicalAccuracy: 9,
          problemSolving: 9,
          depthOfKnowledge: 8,
        },
        action: 'CONCLUDE',
        difficulty: 5,
        memoryUpdates: { topicCompleted: topic3 },
        assistantResponse:
          "That's a great note to end on — thanks for walking me through your thinking today, this was a strong interview.",
      }),
    },
  ])

  assert.equal(
    finalState.memory.completedTopics.length,
    3,
    'all 3 required topics should be completed',
  )
  assert.equal(
    results.at(-1)?.isSessionOver,
    true,
    'should conclude naturally once required topics are covered',
  )
  assert.equal(
    finalState.currentDifficulty,
    5,
    'difficulty should have climbed for a consistently strong candidate',
  )
  assert.deepEqual(
    finalState.memory.technologiesMentioned.sort(),
    ['Kafka', 'Node.js', 'TypeScript'].sort(),
    'technologies mentioned across turns should accumulate',
  )
  console.log('✔ excellent-candidate assertions passed')
}

async function weakCandidateScenario() {
  const blueprint = getBlueprint('TECHNICAL')
  const [topic1] = blueprint.requiredTopics

  const weakAnswer = "Um, I've used a few things, I don't really remember the details."
  const weakEval = {
    relevance: 3,
    completeness: 2,
    technicalAccuracy: 2,
    depthOfKnowledge: 2,
    communication: 3,
  }

  const { finalState, results } = await runScenario('Weak candidate', 'TECHNICAL', [
    {
      candidateMessage: null,
      response: scripted({
        action: 'ADVANCE_TOPIC',
        difficulty: 3,
        memoryUpdates: { nextTopic: topic1 },
        assistantResponse: 'Hi — tell me about the language or framework you know best.',
      }),
    },
    // Model over-optimistically proposes raising difficulty despite a weak
    // answer, three times in a row — the difficulty controller must veto
    // every single one of these.
    {
      candidateMessage: weakAnswer,
      response: scripted({
        evaluation: weakEval,
        action: 'FOLLOW_UP',
        difficulty: 4,
        assistantResponse: 'Can you be more specific — what exactly did you build with it?',
      }),
    },
    {
      candidateMessage: weakAnswer,
      response: scripted({
        evaluation: weakEval,
        action: 'PROBE',
        difficulty: 4,
        assistantResponse:
          'Let’s try a concrete example — walk me through any one project in detail.',
      }),
    },
    {
      candidateMessage: weakAnswer,
      response: scripted({
        evaluation: weakEval,
        action: 'FOLLOW_UP',
        difficulty: 4,
        memoryUpdates: { newWeakness: 'cannot provide concrete technical detail' },
        assistantResponse:
          'Even a small detail is fine — what was the hardest part of that project?',
      }),
    },
    // 4th attempt to dig — this is where the max-follow-up guardrail must
    // fire and force ADVANCE_TOPIC regardless of what the model proposed.
    {
      candidateMessage: weakAnswer,
      response: scripted({
        evaluation: weakEval,
        action: 'PROBE',
        difficulty: 4,
        memoryUpdates: { nextTopic: 'problem-solving approach' },
        assistantResponse: "Let's move on — tell me how you generally approach debugging an issue.",
      }),
    },
  ])

  assert.equal(
    results[1]?.difficulty,
    3,
    'difficulty must not rise on a weak first answer despite the model proposing 4',
  )
  assert.equal(results[2]?.difficulty, 3, 'difficulty must stay vetoed on the second weak answer')
  assert.equal(
    results[3]?.action,
    'FOLLOW_UP',
    'third dig should still be allowed (count was 2, under the cap of 3)',
  )
  assert.equal(
    results[4]?.action,
    'ADVANCE_TOPIC',
    'guardrail must force ADVANCE_TOPIC once the follow-up cap is hit, overriding the model’s PROBE proposal',
  )
  assert.equal(
    finalState.followUpCountOnCurrentTopic,
    0,
    'follow-up counter resets once the guardrail forces a topic change',
  )
  assert.ok(
    finalState.memory.weaknessesObserved.includes('cannot provide concrete technical detail'),
  )
  console.log('✔ weak-candidate assertions passed')
}

async function vagueCandidateScenario() {
  const blueprint = getBlueprint('BEHAVIORAL')
  const [topic1, topic2] = blueprint.requiredTopics

  await runScenario('Vague candidate', 'BEHAVIORAL', [
    {
      candidateMessage: null,
      response: scripted({
        action: 'ADVANCE_TOPIC',
        difficulty: 3,
        memoryUpdates: { nextTopic: topic1 },
        assistantResponse:
          "Hi, I'm your interviewer today. Tell me about a time you led or took ownership of something.",
      }),
    },
    {
      candidateMessage:
        'I led a project once and it went well, the team was happy with the outcome.',
      response: scripted({
        evaluation: { relevance: 5, completeness: 3, communication: 5, starStructure: 2 },
        action: 'PROBE',
        difficulty: 3,
        memoryUpdates: {
          flagUnresolved: 'never described a specific situation or concrete actions taken',
        },
        assistantResponse:
          'Can you walk me through a specific situation — what was the project, what was your actual role, and what did you personally do?',
      }),
    },
    {
      candidateMessage:
        'I was the lead on our checkout redesign. I ran daily standups, wrote the technical spec, and pushed back on a scope-creep request from sales so we shipped on time — conversion went up 12%.',
      response: scripted({
        evaluation: { relevance: 9, completeness: 9, communication: 8, starStructure: 9 },
        action: 'ADVANCE_TOPIC',
        difficulty: 3,
        memoryUpdates: {
          topicCompleted: topic1,
          nextTopic: topic2,
          followUpResolved: 'never described a specific situation or concrete actions taken',
        },
        assistantResponse:
          'That’s much clearer, thank you. Now tell me about a conflict or disagreement you had with a colleague.',
      }),
    },
  ])

  console.log(
    '✔ vague-candidate scenario ran (PROBE on vague answer, then STAR-structured follow-up resolved it)',
  )
}

async function offTopicCandidateScenario() {
  const blueprint = getBlueprint('HR_CULTURE_FIT')
  const [topic1] = blueprint.requiredTopics

  const { finalState } = await runScenario('Off-topic candidate', 'HR_CULTURE_FIT', [
    {
      candidateMessage: null,
      response: scripted({
        action: 'ADVANCE_TOPIC',
        difficulty: 3,
        memoryUpdates: { nextTopic: topic1 },
        assistantResponse: 'Hi! What made you want to apply for this role?',
      }),
    },
    {
      candidateMessage:
        "Honestly the commute to my current job is terrible, that's the main thing.",
      response: scripted({
        evaluation: { relevance: 2, communication: 6, confidence: 5 },
        action: 'CHALLENGE',
        difficulty: 3,
        assistantResponse:
          "That's fair, but let's focus on the role itself — what about this specific position or company interests you?",
      }),
    },
    {
      // Simulate a huge amount of elapsed time to prove the duration
      // guardrail fires independently of topic coverage.
      candidateMessage:
        "I really admire the team's engineering blog and the mission around accessibility.",
      response: scripted({
        evaluation: { relevance: 8, communication: 7, confidence: 7 },
        action: 'FOLLOW_UP',
        difficulty: 3,
        assistantResponse: 'What specifically from the blog stuck with you?',
      }),
    },
  ])

  // Force a duration-guardrail test independent of the scenario above: an
  // interview at/over its max duration must conclude even mid-topic.
  const overtimeBlueprint = getBlueprint('HR_CULTURE_FIT')
  const overtimeResult = await processTurn(
    {
      blueprint: overtimeBlueprint,
      state: { ...finalState, elapsedMs: overtimeBlueprint.expectedDurationMinutes * 60_000 },
      recentTranscript: [],
      candidateMessage: 'One more thought on that...',
      elapsedMs: overtimeBlueprint.expectedDurationMinutes * 60_000 + 1,
    },
    new ScriptedLLMProvider([
      scripted({ action: 'FOLLOW_UP', difficulty: 3, assistantResponse: 'Tell me more.' }),
    ]),
  )
  assert.equal(
    overtimeResult.action,
    'CONCLUDE',
    'duration guardrail must force CONCLUDE once max duration is reached, regardless of the model’s proposal',
  )
  assert.equal(overtimeResult.isSessionOver, true)
  console.log('✔ off-topic-candidate + duration-guardrail assertions passed')
}

async function averageCandidateScenario() {
  const blueprint = getBlueprint('SYSTEM_DESIGN')
  const [topic1, topic2, topic3, topic4] = blueprint.requiredTopics
  const mid = {
    relevance: 6,
    completeness: 5,
    technicalAccuracy: 6,
    problemSolving: 5,
    communication: 6,
  }

  const { finalState, results } = await runScenario('Average candidate', 'SYSTEM_DESIGN', [
    {
      candidateMessage: null,
      response: scripted({
        action: 'ADVANCE_TOPIC',
        difficulty: 3,
        memoryUpdates: { nextTopic: topic1 },
        assistantResponse:
          "Hi, I'm your interviewer today. Let's start — how would you approach designing a URL shortener?",
      }),
    },
    {
      candidateMessage: "I'd want to know expected scale and whether custom aliases are needed.",
      response: scripted({
        evaluation: mid,
        action: 'FOLLOW_UP',
        difficulty: 3,
        assistantResponse:
          'Good start — what about the read/write ratio, does that change your approach?',
      }),
    },
    {
      candidateMessage:
        "Reads would dominate heavily, so I'd lean on caching and maybe a read replica.",
      response: scripted({
        evaluation: mid,
        action: 'ADVANCE_TOPIC',
        difficulty: 3,
        memoryUpdates: { topicCompleted: topic1, nextTopic: topic2 },
        assistantResponse:
          "That's reasonable. Let's move to the high-level architecture — walk me through the main components.",
      }),
    },
    {
      candidateMessage:
        'An API layer, a key-generation service, and a datastore mapping short codes to URLs, behind a load balancer.',
      response: scripted({
        evaluation: mid,
        action: 'ADVANCE_TOPIC',
        difficulty: 4,
        memoryUpdates: { topicCompleted: topic2, nextTopic: topic3 },
        assistantResponse:
          'Solid structure. Now — what storage would you pick for the mapping, and why?',
      }),
    },
    // A slightly weaker moment — the model proposes lowering difficulty,
    // which (unlike a veto on raising it) is always allowed through.
    {
      candidateMessage: 'Probably just... a SQL database I guess, nothing special about it.',
      response: scripted({
        evaluation: {
          relevance: 5,
          completeness: 3,
          technicalAccuracy: 4,
          problemSolving: 4,
          communication: 5,
        },
        action: 'FOLLOW_UP',
        difficulty: 3,
        assistantResponse:
          'Say more — why SQL over a key-value store here, given the access pattern you described earlier?',
      }),
    },
    {
      candidateMessage:
        'Fair point — a key-value store fits better for simple lookups by key, SQL would be overkill.',
      response: scripted({
        evaluation: mid,
        action: 'ADVANCE_TOPIC',
        difficulty: 3,
        memoryUpdates: { topicCompleted: topic3, nextTopic: topic4 },
        assistantResponse: 'Good recovery. Last one — how would this scale as traffic grows 100x?',
      }),
    },
    {
      candidateMessage:
        "I'd shard by key hash and add more cache layers, though I'm less sure about cross-shard analytics.",
      response: scripted({
        evaluation: mid,
        action: 'CONCLUDE',
        difficulty: 3,
        memoryUpdates: { topicCompleted: topic4 },
        assistantResponse: 'That covers what I needed — thanks for working through this with me.',
      }),
    },
  ])

  assert.equal(
    results[3]?.difficulty,
    4,
    'difficulty should climb one step on consistently decent (not just weak) answers',
  )
  assert.equal(
    results[4]?.difficulty,
    3,
    'a model-proposed decrease is always honored, distinct from the increase-veto on weak answers',
  )
  assert.equal(
    finalState.memory.completedTopics.length,
    4,
    'all required topics should be completed for a middling-but-adequate candidate',
  )
  assert.equal(results.at(-1)?.isSessionOver, true)
  console.log('✔ average-candidate assertions passed')
}

async function main() {
  await excellentCandidateScenario()
  await averageCandidateScenario()
  await weakCandidateScenario()
  await vagueCandidateScenario()
  await offTopicCandidateScenario()
  console.log('\nAll scripted scenarios completed and all assertions passed.')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
