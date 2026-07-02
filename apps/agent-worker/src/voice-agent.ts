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

  async onUserTurnCompleted(_chatCtx: ChatContext, newMessage: ChatMessage): Promise<void> {
    const transcript = newMessage.textContent?.trim()

    if (transcript) {
      await this.voiceSession?.publishUpdate({
        type: 'transcript',
        speaker: 'CANDIDATE',
        text: transcript,
      })

      try {
        const result = await this.conversationAdapter.submitMessage(
          this.sessionId,
          this.userId,
          transcript,
        )

        await this.voiceSession?.speak(result.assistantMessage)
        await this.voiceSession?.publishUpdate({
          type: 'transcript',
          speaker: 'AI',
          text: result.assistantMessage,
        })
        await this.voiceSession?.publishUpdate({
          type: 'progress',
          action: result.action,
          difficulty: result.difficulty,
          progress: result.progress,
          isSessionOver: result.isSessionOver,
        })

        if (result.isSessionOver) {
          await this.voiceSession?.end()
        }
      } catch (error) {
        // A Gemini timeout, a transient DB error, whatever — the candidate
        // should hear something sensible instead of dead air, and the
        // worker process must not crash mid-interview.
        logger.error('conversation engine call failed', { error, sessionId: this.sessionId })
        await this.voiceSession?.speak(
          "Sorry, I'm having trouble right now — could you say that again in a moment?",
        )
      }
    }

    // Always suppress the built-in reply generation — no `llm` plugin is
    // configured on the session, so this Agent must be the one driving
    // every reply via speak() above, success or fallback alike.
    throw new voice.StopResponse()
  }
}
