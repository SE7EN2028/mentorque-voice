import { LLMProviderError, LLMRateLimitError, LLMResponseParseError } from './errors.js'
import type { GenerateStructuredParams, LLMProvider } from './llm-provider.js'
import {
  buildSchemaInstruction,
  normalizeAgainstSchema,
  stripCodeFence,
} from './structured-json.js'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const REQUEST_TIMEOUT_MS = 30_000

interface GroqRequestMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// OpenAI-compatible response envelope; Groq also reports some failures
// inside a JSON error body rather than only via the HTTP status.
interface GroqResponseBody {
  choices?: Array<{ message?: { content?: string | null } }>
  error?: { message?: string; code?: number | string; type?: string }
}

/**
 * Pure Groq transport for the LLMProvider seam. Structured output rides the
 * same strategy as OpenRouterProvider: `response_format: json_object`
 * guarantees syntactically valid JSON, the full JSON Schema is spelled into
 * the system prompt, and the response is normalized against our own schema.
 * Retry, backoff, and shape validation live in RateLimitedProvider and
 * ValidatingProvider — never here.
 */
export class GroqProvider implements LLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = 'llama-3.3-70b-versatile',
  ) {}

  async generateStructured<T>(params: GenerateStructuredParams<T>): Promise<T> {
    const messages: GroqRequestMessage[] = [
      {
        role: 'system',
        content: params.systemInstruction + buildSchemaInstruction(params.responseSchema),
      },
      ...params.messages,
    ]

    let response: Response
    try {
      response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'TimeoutError' || error.name === 'AbortError')
      ) {
        throw new LLMProviderError('Groq request timed out')
      }
      throw new LLMProviderError(
        `Groq request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    if (response.status === 429) {
      throw new LLMRateLimitError()
    }
    if (response.status === 401 || response.status === 403) {
      throw new LLMProviderError('Groq rejected the request — check GROQ_API_KEY')
    }
    if (response.status === 404) {
      throw new LLMProviderError(
        `Groq model not found: ${this.model} — set GROQ_MODEL to an available model (https://console.groq.com/docs/models)`,
      )
    }
    if (response.status === 408) {
      throw new LLMProviderError('Groq request timed out (server-side 408)')
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      // Groq's json_object mode reports "the model produced invalid JSON" as
      // an HTTP 400 with code json_validate_failed — that's a bad response
      // body, not a transport failure, so it must surface as a parse error
      // (and get ValidatingProvider's retry) exactly like malformed JSON
      // inside a 200 would.
      if (response.status === 400 && body.includes('json_validate_failed')) {
        throw new LLMResponseParseError('Groq model output failed JSON validation')
      }
      throw new LLMProviderError(`Groq request failed (${response.status}): ${body.slice(0, 500)}`)
    }

    let payload: GroqResponseBody
    try {
      payload = (await response.json()) as GroqResponseBody
    } catch {
      throw new LLMResponseParseError('Groq response was not valid JSON')
    }

    // Defensive parity with OpenRouterProvider: an error body inside a 200
    // must not be mistaken for a usable completion, and rate-limit-shaped
    // errors must reach the retry layer as LLMRateLimitError.
    if (payload.error) {
      const message = payload.error.message ?? 'unknown error'
      if (payload.error.code === 429 || /rate.?limit/i.test(message)) {
        throw new LLMRateLimitError()
      }
      throw new LLMProviderError(`Groq error: ${message}`)
    }

    const content = payload.choices?.[0]?.message?.content
    if (!content) {
      throw new LLMResponseParseError('Groq returned an empty response')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(stripCodeFence(content))
    } catch {
      throw new LLMResponseParseError('Groq response content was not valid JSON')
    }

    return normalizeAgainstSchema(parsed, params.responseSchema) as T
  }
}
