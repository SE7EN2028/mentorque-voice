import * as deepgram from '@livekit/agents-plugin-deepgram'
import type { stt } from '@livekit/agents'

/**
 * Named abstraction over "which speech-to-text engine LiveKit uses" —
 * swapping Deepgram for AssemblyAI later is a new class + one line in
 * getSpeechToTextProvider(); nothing in VoiceAgent or the conversation
 * engine changes.
 */
export interface SpeechToTextProvider {
  readonly name: string
  createSTT(): stt.STT
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set`)
  }
  return value
}

class DeepgramSpeechToTextProvider implements SpeechToTextProvider {
  readonly name = 'deepgram'

  createSTT(): stt.STT {
    return new deepgram.STT({
      model: 'nova-3',
      language: 'en-US',
      apiKey: requireEnv('DEEPGRAM_API_KEY'),
    })
  }
}

let cachedProvider: SpeechToTextProvider | undefined

export function getSpeechToTextProvider(): SpeechToTextProvider {
  cachedProvider ??= new DeepgramSpeechToTextProvider()
  return cachedProvider
}
