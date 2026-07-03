import { GeminiProvider } from './gemini-provider.js'
import type { LLMProvider } from './llm-provider.js'
import { OpenRouterProvider } from './openrouter-provider.js'
import { RateLimitedProvider } from './rate-limited-provider.js'
import { ValidatingProvider } from './validating-provider.js'

// Free-tier account: only `:free` models work. Comma-separated = OpenRouter
// fallback chain, tried in order per request (free pools 429 transiently);
// the API caps the chain at 3 models.
const DEFAULT_OPENROUTER_MODEL =
  'openai/gpt-oss-120b:free,qwen/qwen3-next-80b-a3b-instruct:free,nvidia/nemotron-3-super-120b-a12b:free'

let cachedProvider: LLMProvider | undefined

function createProvider(): LLMProvider {
  const providerName = process.env.LLM_PROVIDER ?? 'openrouter'
  switch (providerName) {
    case 'openrouter': {
      const apiKey = process.env.OPENROUTER_API_KEY
      if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is not set')
      }
      return new OpenRouterProvider(
        apiKey,
        process.env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL,
      )
    }
    case 'gemini': {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set')
      }
      return new GeminiProvider(apiKey)
    }
    default:
      throw new Error(`Unknown LLM_PROVIDER: ${providerName}`)
  }
}

/**
 * Single seam for swapping the LLM provider — every call site depends on
 * the LLMProvider interface, never on a concrete provider directly.
 * `LLM_PROVIDER` picks `openrouter` (default) or `gemini`.
 *
 * Composition order matters: RateLimitedProvider wraps the raw provider
 * directly so every actual API call — including validation retries —
 * respects the rate limit. ValidatingProvider wraps that whole stack so its
 * "call once more" retry goes through the rate limiter too, rather than
 * bypassing it.
 */
export function getLLMProvider(): LLMProvider {
  if (!cachedProvider) {
    cachedProvider = new ValidatingProvider(new RateLimitedProvider(createProvider()))
  }
  return cachedProvider
}
