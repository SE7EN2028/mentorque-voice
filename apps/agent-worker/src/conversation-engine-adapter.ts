import type { InterviewTurnResponseDto, SessionStatus } from '@mentorque/shared'
import { interviewSessionService } from '@mentorque/interview-session'

/**
 * The ONLY thing VoiceAgent knows about "interview logic" — a thin
 * pass-through interface. If the real orchestration entry point ever
 * changes shape, only the implementation below needs updating, not any
 * voice-layer call site.
 */
export interface ConversationEngineAdapter {
  getStatus(sessionId: string, userId: string): Promise<SessionStatus>
  start(sessionId: string, userId: string): Promise<InterviewTurnResponseDto>
  submitMessage(
    sessionId: string,
    userId: string,
    message: string,
  ): Promise<InterviewTurnResponseDto>
  end(sessionId: string, userId: string): Promise<InterviewTurnResponseDto>
  recordVoiceMetadata(
    sessionId: string,
    data: { livekitRoomName: string; sttProvider: string; ttsProvider: string },
  ): Promise<void>
  /** Resolves once any in-flight feedback generation for the session
   * settles — awaited before the worker's job process exits so the report
   * write isn't killed by process.exit. */
  waitForFeedbackCompletion(sessionId: string): Promise<void>
}

export class InterviewEngineAdapter implements ConversationEngineAdapter {
  getStatus(sessionId: string, userId: string) {
    return interviewSessionService.getStatus(sessionId, userId)
  }

  start(sessionId: string, userId: string) {
    return interviewSessionService.start(sessionId, userId)
  }

  submitMessage(sessionId: string, userId: string, message: string) {
    return interviewSessionService.submitMessage(sessionId, userId, message)
  }

  end(sessionId: string, userId: string) {
    return interviewSessionService.end(sessionId, userId)
  }

  recordVoiceMetadata(
    sessionId: string,
    data: { livekitRoomName: string; sttProvider: string; ttsProvider: string },
  ) {
    return interviewSessionService.recordVoiceMetadata(sessionId, data)
  }

  waitForFeedbackCompletion(sessionId: string) {
    return interviewSessionService.waitForFeedbackCompletion(sessionId)
  }
}
