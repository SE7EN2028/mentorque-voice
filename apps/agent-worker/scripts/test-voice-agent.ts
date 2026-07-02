/**
 * Proves VoiceAgent's orchestration logic against fakes for both the
 * transport (VoiceSession) and the engine (ConversationEngineAdapter) —
 * no LiveKit room, no Gemini, no database. This is what makes it possible
 * to verify "does a Gemini timeout produce a spoken fallback instead of
 * silence" deterministically, without live credentials for any of the
 * three external services this worker depends on. Run with
 * `npm run test:voice-agent`.
 */
import assert from 'node:assert/strict'
import { voice } from '@livekit/agents'
import type { ChatContext, ChatMessage } from '@livekit/agents'
import type { InterviewTurnResponseDto, SessionStatus, VoiceUpdatePayload } from '@mentorque/shared'
import type { ConversationEngineAdapter } from '../src/conversation-engine-adapter.js'
import { VoiceAgent } from '../src/voice-agent.js'
import type { VoiceSession } from '../src/voice-session.js'

class FakeVoiceSession implements VoiceSession {
  spoken: string[] = []
  updates: VoiceUpdatePayload[] = []
  ended = false

  async speak(text: string): Promise<void> {
    this.spoken.push(text)
  }
  async publishUpdate(payload: VoiceUpdatePayload): Promise<void> {
    this.updates.push(payload)
  }
  async end(): Promise<void> {
    this.ended = true
  }
}

class FakeConversationEngineAdapter implements ConversationEngineAdapter {
  submitMessageCalls: string[] = []
  nextResponse: InterviewTurnResponseDto | null = null
  shouldThrow = false

  async getStatus(): Promise<SessionStatus> {
    return 'ACTIVE'
  }
  async start(): Promise<InterviewTurnResponseDto> {
    throw new Error('not exercised in this test')
  }
  async submitMessage(
    _sessionId: string,
    _userId: string,
    message: string,
  ): Promise<InterviewTurnResponseDto> {
    this.submitMessageCalls.push(message)
    if (this.shouldThrow) throw new Error('simulated Gemini timeout')
    if (!this.nextResponse) throw new Error('test misconfigured: no nextResponse set')
    return this.nextResponse
  }
  async end(): Promise<InterviewTurnResponseDto> {
    throw new Error('not exercised in this test')
  }
  async recordVoiceMetadata(): Promise<void> {}
}

function fakeChatMessage(textContent: string): ChatMessage {
  return { textContent } as unknown as ChatMessage
}

async function expectStopResponse(fn: () => Promise<void>): Promise<void> {
  await assert.rejects(fn, voice.StopResponse)
}

async function testNormalTurn() {
  const adapter = new FakeConversationEngineAdapter()
  adapter.nextResponse = {
    assistantMessage: 'Tell me about a challenging project.',
    action: 'ADVANCE_TOPIC',
    difficulty: 3,
    progress: {
      stage: 'active',
      questionsAskedCount: 2,
      requiredTopicsCovered: 1,
      requiredTopicsTotal: 3,
      currentTopic: 'topic2',
      elapsedMs: 1000,
      maxDurationMs: 1_200_000,
    },
    isSessionOver: false,
  }

  const agent = new VoiceAgent('session_1', 'user_1', adapter)
  const voiceSession = new FakeVoiceSession()
  agent.attachVoiceSession(voiceSession)

  await expectStopResponse(() =>
    agent.onUserTurnCompleted({} as ChatContext, fakeChatMessage('I built a payments pipeline.')),
  )

  assert.deepEqual(adapter.submitMessageCalls, ['I built a payments pipeline.'])
  assert.equal(voiceSession.spoken[0], 'Tell me about a challenging project.')
  assert.equal(
    voiceSession.updates.filter((u) => u.type === 'transcript').length,
    2,
    'both the candidate utterance and the AI reply should be published as transcript entries',
  )
  assert.equal(voiceSession.ended, false)
  console.log(
    '✔ normal turn: adapter called once, response spoken, both transcript sides published',
  )
}

async function testSessionOverEndsVoiceSession() {
  const adapter = new FakeConversationEngineAdapter()
  adapter.nextResponse = {
    assistantMessage: 'Thanks for your time today.',
    action: 'CONCLUDE',
    difficulty: 3,
    progress: {
      stage: 'closing',
      questionsAskedCount: 8,
      requiredTopicsCovered: 3,
      requiredTopicsTotal: 3,
      currentTopic: null,
      elapsedMs: 1_100_000,
      maxDurationMs: 1_200_000,
    },
    isSessionOver: true,
  }

  const agent = new VoiceAgent('session_2', 'user_2', adapter)
  const voiceSession = new FakeVoiceSession()
  agent.attachVoiceSession(voiceSession)

  await expectStopResponse(() =>
    agent.onUserTurnCompleted({} as ChatContext, fakeChatMessage('That covers everything.')),
  )

  assert.equal(voiceSession.ended, true, 'the voice session should end once the engine concludes')
  console.log('✔ isSessionOver ends the voice session')
}

async function testEngineFailureFallsBackGracefully() {
  const adapter = new FakeConversationEngineAdapter()
  adapter.shouldThrow = true

  const agent = new VoiceAgent('session_3', 'user_3', adapter)
  const voiceSession = new FakeVoiceSession()
  agent.attachVoiceSession(voiceSession)

  await expectStopResponse(() =>
    agent.onUserTurnCompleted({} as ChatContext, fakeChatMessage('Some answer.')),
  )

  assert.equal(voiceSession.spoken.length, 1, 'a fallback line should be spoken, not silence')
  assert.match(voiceSession.spoken[0] ?? '', /trouble/i)
  assert.equal(voiceSession.ended, false, 'a single failed turn should not end the interview')
  console.log(
    '✔ engine failure (simulated Gemini timeout) speaks a fallback line instead of hanging or crashing the worker',
  )
}

async function testEmptyTranscriptSkipsEngineCall() {
  const adapter = new FakeConversationEngineAdapter()
  const agent = new VoiceAgent('session_4', 'user_4', adapter)
  const voiceSession = new FakeVoiceSession()
  agent.attachVoiceSession(voiceSession)

  await expectStopResponse(() =>
    agent.onUserTurnCompleted({} as ChatContext, fakeChatMessage('   ')),
  )

  assert.equal(
    adapter.submitMessageCalls.length,
    0,
    'a blank/whitespace-only transcript should never reach the conversation engine',
  )
  assert.equal(voiceSession.spoken.length, 0)
  console.log('✔ empty/whitespace transcript is a no-op, not an empty engine call')
}

async function main() {
  await testNormalTurn()
  await testSessionOverEndsVoiceSession()
  await testEngineFailureFallsBackGracefully()
  await testEmptyTranscriptSkipsEngineCall()
  console.log('\nVoiceAgent orchestration verified.')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
