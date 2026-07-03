import { LLMRateLimitError } from './errors.js'
import type { GenerateStructuredParams, LLMProvider } from './llm-provider.js'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wraps any LLMProvider with a sliding-window call limiter plus exponential
 * backoff on rate-limit errors. Exists mainly because Gemini's free tier is
 * a tight ~10 requests/minute — this keeps the app under that instead of
 * spraying 429s at it. Decorates the interface, so the engine can't tell
 * whether it's talking to a rate-limited provider or a raw one.
 */
export class RateLimitedProvider implements LLMProvider {
  private readonly callTimestamps: number[] = []

  constructor(
    private readonly inner: LLMProvider,
    private readonly maxPerMinute = 8,
    private readonly maxRetries = 3,
  ) {}

  async generateStructured<T>(params: GenerateStructuredParams<T>): Promise<T> {
    await this.waitForSlot()
    return this.callWithRetry<T>(params, 0)
  }

  private async waitForSlot(): Promise<void> {
    const now = Date.now()
    let oldest = this.callTimestamps[0]
    while (oldest !== undefined && now - oldest >= 60_000) {
      this.callTimestamps.shift()
      oldest = this.callTimestamps[0]
    }

    if (this.callTimestamps.length >= this.maxPerMinute && oldest !== undefined) {
      const waitMs = 60_000 - (now - oldest) + 50
      await sleep(waitMs)
      return this.waitForSlot()
    }

    this.callTimestamps.push(Date.now())
  }

  private async callWithRetry<T>(params: GenerateStructuredParams<T>, attempt: number): Promise<T> {
    try {
      return await this.inner.generateStructured<T>(params)
    } catch (error) {
      if (error instanceof LLMRateLimitError && attempt < this.maxRetries) {
        // 5s/10s/20s: free-tier limits are typically per-minute windows
        // (Groq tokens-per-minute, OpenRouter free pools) — short retries
        // land inside the same exhausted window and fail the turn, so wait
        // long enough to reach the next one.
        await sleep(2 ** attempt * 5000)
        return this.callWithRetry<T>(params, attempt + 1)
      }
      throw error
    }
  }
}
