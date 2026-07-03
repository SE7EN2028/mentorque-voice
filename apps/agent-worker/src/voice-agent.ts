import { voice } from '@livekit/agents'
import type { ChatContext, ChatMessage } from '@livekit/agents'
import type { ConversationEngineAdapter } from './conversation-engine-adapter.js'
import { logger } from './logger.js'
import type { VoiceSession } from './voice-session.js'

/**
 * The voice-side orchestrator for one interview room. Deliberately has no
 * interview-specific logic of its own — every decision comes from
 * ConversationEngineAdapter; this class only ever forwards a candidate's
 * finalized utterance in and speaks whatever comes back. No LLM plugin is
 * configured on the session at all: onUserTurnCompleted always intercepts
 * and throws StopResponse, so the built-in reply path never runs.
 */
export class VoiceAgent extends voice.Agent {
  private voiceSession: VoiceSession | undefined
  // Serializes engine calls: a candidate committing a new utterance while
  // the previous turn's LLM call is still in flight must not produce two
  // concurrent submitMessage calls — they'd race on transcript sequence
  // numbers and clobber each other's engineState writes.
  private turnChain: Promise<void> = Promise.resolve()
  // Set once the end path has run; queued turns behind it become no-ops
  // instead of 409ing against a CLOSING session (and flipping it back to
  // ACTIVE mid-feedback-generation).
  private ended = false

  constructor(
    private readonly sessionId: string,
    private readonly userId: string,
    private readonly conversationAdapter: ConversationEngineAdapter,
  ) {
    super({
      instructions:
        'Unused — onUserTurnCompleted always intercepts and this Agent never generates its own reply.',
    })
  }

  attachVoiceSession(voiceSession: VoiceSession): void {
    this.voiceSession = voiceSession
  }

  /**
   * Runs `fn` behind any in-flight turn — the end_session control handler
   * uses this so ending the interview can't interleave with a turn whose
   * LLM call is still pending (which used to publish a stray follow-up
   * after the farewell and regress the session status from CLOSING back to
   * ACTIVE). Marks the agent ended so turns queued behind it are dropped.
   */
  async runEndExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.turnChain.then(() => {
      this.ended = true
      return fn()
    })
    this.turnChain = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  /** Resolves once no turn/end work is in flight. The job's shutdown
   * callback awaits this so a participant disconnect (client navigated
   * away) can't process.exit a turn or end() that is still talking to the
   * LLM/database. */
  async waitForIdle(): Promise<void> {
    let current
    do {
      current = this.turnChain
      await current.catch(() => {})
    } while (current !== this.turnChain)
  }

  async onUserTurnCompleted(_chatCtx: ChatContext, newMessage: ChatMessage): Promise<void> {
    const transcript = newMessage.textContent?.trim()

    if (transcript) {
      this.turnChain = this.turnChain.then(() => this.handleTurn(transcript))
      await this.turnChain
    }

    // Always suppress the built-in reply generation — no `llm` plugin is
    // configured on the session, so this Agent must be the one driving
    // every reply via speak() above, success or fallback alike.
    throw new voice.StopResponse()
  }

  private async handleTurn(transcript: string): Promise<void> {
    if (this.ended) return
    await this.voiceSession?.publishUpdate({
      type: 'transcript',
      speaker: 'CANDIDATE',
      text: transcript,
    })
    // The SDK's own state machine never enters 'thinking' here (that only
    // wraps built-in reply generation, which StopResponse suppresses), so
    // publish it manually for the several seconds the engine call takes.
    await this.voiceSession?.publishUpdate({ type: 'agent_state', state: 'thinking' })

    try {
      const result = await this.conversationAdapter.submitMessage(
        this.sessionId,
        this.userId,
        transcript,
      )

      // Caption publishes before speech starts so the UI updates as the
      // answer is heard, not after playout.
      await this.voiceSession?.publishUpdate({
        type: 'transcript',
        speaker: 'AI',
        text: result.assistantMessage,
      })
      if (!result.isSessionOver) {
        await this.voiceSession?.publishUpdate({
          type: 'progress',
          action: result.action,
          difficulty: result.difficulty,
          progress: result.progress,
          isSessionOver: false,
        })
        await this.voiceSession?.speak(result.assistantMessage)
      } else {
        // Closing turn: the client navigates away shortly after it sees
        // isSessionOver, and navigating disconnects the room — so the
        // farewell must fully play out BEFORE that progress payload goes
        // out, or the goodbye gets cut off mid-sentence.
        this.ended = true
        await this.voiceSession?.speak(result.assistantMessage, { awaitPlayout: true })
        await this.voiceSession?.publishUpdate({
          type: 'progress',
          action: result.action,
          difficulty: result.difficulty,
          progress: result.progress,
          isSessionOver: true,
        })
        await this.voiceSession?.end()
      }
    } catch (error) {
      // An LLM timeout, a transient DB error, whatever — the candidate
      // should hear something sensible instead of dead air, and the
      // worker process must not crash mid-interview.
      logger.error('conversation engine call failed', { error, sessionId: this.sessionId })
      await this.voiceSession?.speak(
        "Sorry, I'm having trouble right now — could you say that again in a moment?",
      )
    }
  }
}
