import { LLMProviderError, LLMRateLimitError, LLMResponseParseError } from './errors.js'
import type { GenerateStructuredParams, LLMProvider } from './llm-provider.js'

/**
 * Wraps any LLMProvider and enforces "reject malformed responses, retry
 * once": runs the inner provider's output through the caller-supplied
 * validate() (typically a Zod schema's safeParse), and re-issues the same
 * request once if the first attempt doesn't pass. The provider being
 * wrapped never needs to know what "valid" means for any given caller —
 * that knowledge (the Zod schema) stays in the conversation engine, which
 * is what keeps interview-specific business logic out of the LLM provider.
 */
export class ValidatingProvider implements LLMProvider {
  constructor(private readonly inner: LLMProvider) {}

  async generateStructured<T>(params: GenerateStructuredParams<T>): Promise<T> {
    const first = await this.attempt(params)
    if (first.success && first.data !== undefined) {
      return first.data
    }

    const retry = await this.attempt(params)
    if (retry.success && retry.data !== undefined) {
      return retry.data
    }

    // When both attempts died in transport (timeout, network, auth) rather
    // than producing unusable content, surface that error instead of a
    // misleading "invalid structured output" — a bad API key must not read
    // as a model-quality problem.
    if (retry.error instanceof LLMProviderError) {
      throw retry.error
    }
    throw new LLMResponseParseError(
      'Model returned invalid structured output twice in a row (initial attempt + one retry)',
    )
  }

  private async attempt<T>(
    params: GenerateStructuredParams<T>,
  ): Promise<{ success: boolean; data?: T; error?: unknown }> {
    try {
      const raw = await this.inner.generateStructured<T>(params)
      return params.validate(raw)
    } catch (error) {
      // Rate-limit exhaustion is a distinct, already-handled concern (the
      // inner RateLimitedProvider already retried with backoff) — treating
      // it as "invalid output, try again" here would just hit the same
      // limit a second time. Only content-shape failures (bad JSON, schema
      // mismatch) count against this retry-once budget.
      if (error instanceof LLMRateLimitError) {
        throw error
      }
      return { success: false, error }
    }
  }
}
