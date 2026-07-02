/**
 * Verifies the Feedback Engine in isolation: deterministic-metrics math,
 * the qualitative response schema's accept/reject behavior, and the
 * orchestrator's merge of the two — all against a fake LLMProvider, no
 * network or database involved. The retry-once-on-invalid-output mechanism
 * itself is Phase 4's ValidatingProvider, already proven by
 * packages/interview-engine's own `npm run test:retry`; this script proves
 * the piece unique to this package — that generateFeedbackReport wires the
 * real feedbackResponseSchema into the provider boundary ValidatingProvider
 * relies on, and merges deterministic + qualitative data correctly.
 */
import assert from 'node:assert/strict'
import type {
  InterviewBlueprint,
  GenerateStructuredParams,
  LLMProvider,
} from '@mentorque/interview-engine'
import type { ConversationMemory } from '@mentorque/interview-engine'
import { computeDeterministicMetrics } from '../src/deterministic-metrics.js'
import { generateFeedbackReport } from '../src/feedback-engine.js'
import { feedbackResponseSchema } from '../src/response-schema.js'
import type { FeedbackEngineInput, FeedbackTranscriptTurn } from '../src/types.js'

const blueprint: InterviewBlueprint = {
  interviewType: 'TECHNICAL',
  label: 'Technical',
  interviewerPersonality: 'Direct and technically rigorous.',
  requiredTopics: ['Topic A', 'Topic B'],
  optionalTopics: ['Topic C'],
  evaluationCriteria: [
    'relevance',
    'completeness',
    'technicalAccuracy',
    'problemSolving',
    'communication',
  ],
  expectedDurationMinutes: 25,
}

const finalMemory: ConversationMemory = {
  candidateProfile: { name: 'Ada Lovelace', jobRole: 'Backend Engineer', experienceLevel: 'MID' },
  resumeContext: '5 years Node.js, distributed systems.',
  jobDescriptionContext: 'Senior backend role, Postgres + TypeScript.',
  technologiesMentioned: ['TypeScript', 'Postgres'],
  projectsMentioned: [{ name: 'Payments service', summary: 'Rewrote billing pipeline.' }],
  strengthsObserved: ['Clear communicator'],
  weaknessesObserved: ['Shallow on distributed consensus'],
  completedTopics: ['Topic A'],
  currentTopic: 'Topic B',
  unresolvedFollowUps: [],
}

const transcript: FeedbackTranscriptTurn[] = [
  {
    role: 'INTERVIEWER',
    content: 'Tell me about Topic A.',
    actionTaken: 'ADVANCE_TOPIC',
    difficultyAtTurn: 2,
  },
  { role: 'CANDIDATE', content: 'Topic A answer.' },
  {
    role: 'INTERVIEWER',
    content: 'Dig deeper on that.',
    actionTaken: 'FOLLOW_UP',
    difficultyAtTurn: 3,
  },
  { role: 'CANDIDATE', content: 'Follow-up answer.' },
  {
    role: 'INTERVIEWER',
    content: "Let's move to Topic B.",
    actionTaken: 'ADVANCE_TOPIC',
    difficultyAtTurn: 3,
  },
  { role: 'CANDIDATE', content: 'Topic B answer.' },
  {
    role: 'INTERVIEWER',
    content: "I'll push back on that.",
    actionTaken: 'CHALLENGE',
    difficultyAtTurn: 4,
  },
  { role: 'CANDIDATE', content: 'Rebuttal.' },
]

const evaluationHistory = [
  {
    relevance: 8,
    completeness: 7,
    technicalAccuracy: 6,
    problemSolving: 7,
    depthOfKnowledge: null,
    communication: 9,
    confidence: 8,
    starStructure: null,
  },
  {
    relevance: 6,
    completeness: 6,
    technicalAccuracy: 8,
    problemSolving: 7,
    depthOfKnowledge: null,
    communication: 7,
    confidence: 7,
    starStructure: null,
  },
]

const input: FeedbackEngineInput = {
  interviewType: 'TECHNICAL',
  blueprint,
  transcript,
  evaluationHistory,
  finalMemory,
  startedAt: '2026-01-01T10:00:00.000Z',
  endedAt: '2026-01-01T10:25:00.000Z',
  maxDurationMs: 25 * 60_000,
}

function testDeterministicMetrics() {
  const metrics = computeDeterministicMetrics(input)

  assert.deepEqual(
    metrics.topicCoverage,
    [
      { topic: 'Topic A', required: true, covered: true },
      { topic: 'Topic B', required: true, covered: false },
      { topic: 'Topic C', required: false, covered: false },
    ],
    'topic coverage should reflect finalMemory.completedTopics against blueprint topics',
  )
  assert.equal(metrics.requiredTopicsCoveredCount, 1)
  assert.equal(metrics.requiredTopicsTotal, 2)

  assert.equal(
    metrics.difficultyReached,
    4,
    'difficulty reached should be the max across interviewer turns',
  )
  assert.deepEqual(metrics.difficultyProgression, [2, 3, 3, 4])

  assert.equal(
    metrics.totalFollowUps,
    2,
    'FOLLOW_UP + CHALLENGE count as digging actions, ADVANCE_TOPIC does not',
  )
  assert.equal(metrics.questionsAskedCount, 4, 'one count per INTERVIEWER turn')

  assert.equal(metrics.durationMs, 25 * 60_000)

  assert.equal(
    metrics.dimensionScores.depthOfKnowledge,
    null,
    'a dimension with no non-null scores must average to null, not 0',
  )
  assert.equal(metrics.dimensionScores.starStructure, null)
  assert.equal(metrics.dimensionScores.communication, 8, '(9 + 7) / 2 = 8')
  assert.ok(
    metrics.overallScore > 0 && metrics.overallScore <= 100,
    'overall score must be a 0-100 int',
  )
  console.log(
    '✔ computeDeterministicMetrics: topic coverage, difficulty, follow-ups, duration, null-safe averaging',
  )
}

function testResponseSchemaValidation() {
  const valid = {
    summary: 'Solid technical interview overall.',
    topStrengths: ['Clear on Topic A'],
    areasForImprovement: ['Shallow on Topic B'],
    missedOpportunities: [],
    recommendedNextSteps: ['Practice distributed systems design'],
    actionablePracticeAdvice: ['Build a small Raft implementation'],
  }
  assert.equal(feedbackResponseSchema.safeParse(valid).success, true)

  const missingField = { ...valid, summary: undefined }
  assert.equal(feedbackResponseSchema.safeParse(missingField).success, false)

  const emptyRequiredArray = { ...valid, topStrengths: [] }
  assert.equal(
    feedbackResponseSchema.safeParse(emptyRequiredArray).success,
    false,
    'topStrengths requires at least one entry',
  )
  console.log(
    '✔ feedbackResponseSchema: accepts well-formed output, rejects missing/empty required fields',
  )
}

class FakeLLMProvider implements LLMProvider {
  public capturedValidate?: GenerateStructuredParams<unknown>['validate']
  public callCount = 0

  constructor(private readonly response: unknown) {}

  async generateStructured<T>(params: GenerateStructuredParams<T>): Promise<T> {
    this.callCount += 1
    this.capturedValidate = params.validate as GenerateStructuredParams<unknown>['validate']
    return this.response as T
  }
}

async function testGenerateFeedbackReportMergesCorrectly() {
  const qualitative = {
    summary: 'Solid technical interview overall.',
    topStrengths: ['Clear on Topic A'],
    areasForImprovement: ['Shallow on Topic B'],
    missedOpportunities: [],
    recommendedNextSteps: ['Practice distributed systems design'],
    actionablePracticeAdvice: ['Build a small Raft implementation'],
  }
  const fake = new FakeLLMProvider(qualitative)
  const metrics = computeDeterministicMetrics(input)

  const report = await generateFeedbackReport(input, fake)

  assert.equal(fake.callCount, 1)
  assert.equal(report.overallScore, metrics.overallScore)
  assert.deepEqual(report.dimensionScores, metrics.dimensionScores)
  assert.deepEqual(report.topicCoverage, metrics.topicCoverage)
  assert.equal(report.difficultyReached, metrics.difficultyReached)
  assert.deepEqual(report.difficultyProgression, metrics.difficultyProgression)
  assert.equal(report.durationMs, metrics.durationMs)
  assert.deepEqual(report.summary, qualitative.summary)
  assert.deepEqual(report.topStrengths, qualitative.topStrengths)
  assert.deepEqual(report.areasForImprovement, qualitative.areasForImprovement)
  assert.deepEqual(report.missedOpportunities, qualitative.missedOpportunities)
  assert.deepEqual(report.recommendedNextSteps, qualitative.recommendedNextSteps)
  assert.deepEqual(report.actionablePracticeAdvice, qualitative.actionablePracticeAdvice)
  assert.ok(
    !Number.isNaN(new Date(report.generatedAt).getTime()),
    'generatedAt must be a valid ISO timestamp',
  )

  console.log(
    '✔ generateFeedbackReport: merges deterministic metrics with LLM qualitative output 1:1',
  )
}

async function testGenerateFeedbackReportWiresRealSchemaIntoValidate() {
  const qualitative = {
    summary: 'ok',
    topStrengths: ['x'],
    areasForImprovement: ['y'],
    missedOpportunities: [],
    recommendedNextSteps: ['z'],
    actionablePracticeAdvice: ['w'],
  }
  const fake = new FakeLLMProvider(qualitative)
  await generateFeedbackReport(input, fake)

  assert.ok(
    fake.capturedValidate,
    'generateFeedbackReport must pass a validate function to the provider',
  )
  const goodResult = fake.capturedValidate!(qualitative)
  assert.equal(goodResult.success, true)

  const malformed = { ...qualitative, topStrengths: [] }
  const badResult = fake.capturedValidate!(malformed)
  assert.equal(
    badResult.success,
    false,
    'validate must reject malformed output — this is exactly the seam ValidatingProvider (Phase 4) uses to decide whether to retry',
  )
  console.log(
    '✔ generateFeedbackReport: wires the real feedbackResponseSchema into the provider validate boundary',
  )
}

async function main() {
  testDeterministicMetrics()
  testResponseSchemaValidation()
  await testGenerateFeedbackReportMergesCorrectly()
  await testGenerateFeedbackReportWiresRealSchemaIntoValidate()
  console.log('\nFeedback Engine verified.')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
