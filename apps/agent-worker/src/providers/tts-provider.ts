import * as cartesia from '@livekit/agents-plugin-cartesia'
import * as google from '@livekit/agents-plugin-google'
import type { tts } from '@livekit/agents'

/**
 * Named abstraction over "which text-to-speech engine LiveKit uses" —
 * default is Google for development (generous usage before any bill),
 * swappable to Cartesia (lower latency, more natural) via one env var for
 * a recorded demo. Neither VoiceAgent nor the conversation engine cares
 * which is active.
 *
 * Note: the Node.js Agents SDK has no classic Google Cloud Text-to-Speech
 * export (that REST API is Python-only in LiveKit's plugin catalog) — the
 * only Node-compatible Google option is Gemini's own native TTS via
 * `@livekit/agents-plugin-google`'s `beta.TTS`. Used here as the closest
 * available match to "Google TTS for development."
 */
export interface TextToSpeechProvider {
  readonly name: string
  createTTS(): tts.TTS
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set`)
  }
  return value
}

class GoogleTextToSpeechProvider implements TextToSpeechProvider {
  readonly name = 'google'

  createTTS(): tts.TTS {
    return new google.beta.TTS({
      model: 'gemini-3.1-flash-tts-preview',
      voiceName: 'Kore',
      apiKey: requireEnv('GOOGLE_API_KEY'),
    })
  }
}

class CartesiaTextToSpeechProvider implements TextToSpeechProvider {
  readonly name = 'cartesia'

  createTTS(): tts.TTS {
    return new cartesia.TTS({
      model: 'sonic-3',
      voice: 'f786b574-daa5-4673-aa0c-cbe3e8534c02',
      apiKey: requireEnv('CARTESIA_API_KEY'),
    })
  }
}

let cachedProvider: TextToSpeechProvider | undefined

export function getTextToSpeechProvider(): TextToSpeechProvider {
  if (!cachedProvider) {
    const providerName = process.env.TTS_PROVIDER ?? 'google'
    switch (providerName) {
      case 'google':
        cachedProvider = new GoogleTextToSpeechProvider()
        break
      case 'cartesia':
        cachedProvider = new CartesiaTextToSpeechProvider()
        break
      default:
        throw new Error(`Unknown TTS_PROVIDER: ${providerName}`)
    }
  }
  return cachedProvider
}
