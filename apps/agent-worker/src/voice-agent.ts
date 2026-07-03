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
  // Committed-but-not-yet-answered utterance fragments, merged after
  // `pauseGraceMs` of quiet (see onUserTurnCompleted).
  private fragmentBuffer: string[] = []
  private pauseTimer: ReturnType<typeof setTimeout> | undefined

  constructor(
    private readonly sessionId: string,
    private readonly userId: string,
    private readonly conversationAdapter: ConversationEngineAdapter,
    // How long to sit on a committed utterance before answering, so a
    // candidate pausing to think isn't cut off — if they resume, the next
    // fragment resets the window and merges into the same engine turn.
    // Exists because the SDK's own endpointing delay is unreliable in
    // @livekit/agents 1.5.0: an STT-triggered end-of-turn pass recomputes
    // its wait from a stale STT-projected lastSpeakingTime (seconds in the
    // past), so turns commit almost immediately after silence no matter
    // what turnHandling.endpointing is set to. 0 = answer immediately.
    private readonly pauseGraceMs = 0,
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
    // Anything still sitting in the grace window is dropped — the candidate
    // chose to end, and a post-farewell engine turn must not fire.
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer)
      this.pauseTimer = undefined
    }
    this.fragmentBuffer = []
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

    if (transcript && !this.ended) {
      this.fragmentBuffer.push(transcript)
      // Caption each fragment as it lands so the on-screen transcript stays
      // live even while the grace window is still open.
      await this.voiceSession?.publishUpdate({
        type: 'transcript',
        speaker: 'CANDIDATE',
        text: transcript,
      })

      if (this.pauseTimer) clearTimeout(this.pauseTimer)
      if (this.pauseGraceMs <= 0) {
        // No grace window: process inline and finish before returning, the
        // same contract the pre-grace implementation had.
        this.flushFragments()
        await this.turnChain
      } else {
        // Grace window open: return immediately so the next fragment (the
        // candidate resuming after a pause) can arrive and merge; the timer
        // queues the merged turn when the window closes untouched.
        this.pauseTimer = setTimeout(() => this.flushFragments(), this.pauseGraceMs)
      }
    }

    // Always suppress the built-in reply generation — no `llm` plugin is
    // configured on the session, so this Agent must be the one driving
    // every reply via speak() above, success or fallback alike.
    throw new voice.StopResponse()
  }

  /** Merges everything said since the last engine turn and queues it for
   * processing. Runs when the pause-grace window closes without the
   * candidate resuming. */
  private flushFragments(): void {
    this.pauseTimer = undefined
    const transcript = this.fragmentBuffer.join(' ').trim()
    this.fragmentBuffer = []
    if (!transcript) return
    this.turnChain = this.turnChain.then(() => this.handleTurn(transcript))
  }

  private async handleTurn(transcript: string): Promise<void> {
    if (this.ended) return
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
