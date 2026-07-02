import { GeminiProvider } from './gemini-provider.js'
import type { LLMProvider } from './llm-provider.js'
import { RateLimitedProvider } from './rate-limited-provider.js'
import { ValidatingProvider } from './validating-provider.js'

let cachedProvider: LLMProvider | undefined

/**
 * Single seam for swapping the LLM provider — every call site depends on
 * the LLMProvider interface, never on Gemini directly.
 *
 * Composition order matters: RateLimitedProvider wraps GeminiProvider
 * directly so every actual API call — including validation retries —
 * respects the rate limit. ValidatingProvider wraps that whole stack so its
 * "call once more" retry goes through the rate limiter too, rather than
 * bypassing it.
 */
export function getLLMProvider(): LLMProvider {
  if (!cachedProvider) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set')
    }
    cachedProvider = new ValidatingProvider(new RateLimitedProvider(new GeminiProvider(apiKey)))
  }
  return cachedProvider
}
