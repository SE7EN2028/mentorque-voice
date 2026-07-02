import { GeminiProvider } from './gemini-provider.js'
import type { LLMProvider } from './llm-provider.js'
import { RateLimitedProvider } from './rate-limited-provider.js'

let cachedProvider: LLMProvider | undefined

/** Single seam for swapping the LLM provider — every call site depends on
 * the LLMProvider interface, never on Gemini directly. */
export function getLLMProvider(): LLMProvider {
  if (!cachedProvider) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set')
    }
    cachedProvider = new RateLimitedProvider(new GeminiProvider(apiKey))
  }
  return cachedProvider
}
