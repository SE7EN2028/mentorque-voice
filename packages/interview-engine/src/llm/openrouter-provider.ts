import { LLMProviderError, LLMRateLimitError, LLMResponseParseError } from './errors.js'
import type { GenerateStructuredParams, LLMProvider } from './llm-provider.js'
import {
  buildSchemaInstruction,
  normalizeAgainstSchema,
  stripCodeFence,
} from './structured-json.js'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
// Free-pool models can be slow (some route to reasoning models); a tight
// timeout here turns "slow but fine" into a dropped interview turn.
const REQUEST_TIMEOUT_MS = 45_000

// The account runs on OpenRouter's free tier (no purchased credits), so only
// `:free` models are usable at all. Individual free pools throw transient
// upstream 429s, so the default is a fallback chain — OpenRouter tries each
// model in order within a single request. The API rejects `models` arrays
// longer than 3.
const MAX_FALLBACK_MODELS = 3
const DEFAULT_FREE_MODEL_CHAIN =
  'openai/gpt-oss-120b:free,qwen/qwen3-next-80b-a3b-instruct:free,nvidia/nemotron-3-super-120b-a12b:free'

interface OpenRouterRequestMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenRouterResponseBody {
  choices?: Array<{ message?: { content?: string | null } }>
  error?: { message?: string; code?: number | string; metadata?: { raw?: unknown } }
}

// Schema-as-prompt, code-fence stripping, and null-array normalization all
// live in structured-json.ts, shared with GroqProvider — both speak the
// OpenAI-compatible dialect where schema adherence is prompt-carried.

export class OpenRouterProvider implements LLMProvider {
  // A comma-separated model list becomes OpenRouter's `models` fallback
  // array: one request, tried against each model in order until one accepts.
  private readonly models: string[]

  constructor(
    private readonly apiKey: string,
    model = DEFAULT_FREE_MODEL_CHAIN,
  ) {
    this.models = model
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, MAX_FALLBACK_MODELS)
  }

  async generateStructured<T>(params: GenerateStructuredParams<T>): Promise<T> {
    const messages: OpenRouterRequestMessage[] = [
      {
        role: 'system',
        content: params.systemInstruction + buildSchemaInstruction(params.responseSchema),
      },
      ...params.messages,
    ]

    let response: Response
    try {
      response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(this.models.length > 1
            ? { model: this.models[0], models: this.models }
            : { model: this.models[0] }),
          messages,
          response_format: { type: 'json_object' },
          // Voice turns are latency-sensitive; reasoning models in the free
          // chain (gpt-oss, nemotron) default to medium-effort thinking that
          // adds seconds per turn. Ignored by non-reasoning models.
          reasoning: { effort: 'low' },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'TimeoutError' || error.name === 'AbortError')
      ) {
        throw new LLMProviderError('OpenRouter request timed out')
      }
      throw new LLMProviderError(
        `OpenRouter request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    if (response.status === 429) {
      throw new LLMRateLimitError()
    }
    if (response.status === 401 || response.status === 403) {
      throw new LLMProviderError('OpenRouter rejected the request — check OPENROUTER_API_KEY')
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new LLMProviderError(
        `OpenRouter request failed (${response.status}): ${body.slice(0, 500)}`,
      )
    }

    let payload: OpenRouterResponseBody
    try {
      payload = (await response.json()) as OpenRouterResponseBody
    } catch {
      throw new LLMResponseParseError('OpenRouter response was not valid JSON')
    }

    // OpenRouter sometimes reports an upstream-model failure inside a 200
    // response body instead of a non-2xx status. Free-tier pools also
    // exhaust with non-429 codes but rate-limit semantics ("ResourceExhausted",
    // "temporarily rate-limited upstream") — those must map to
    // LLMRateLimitError so the retry/backoff layer re-runs the request (and
    // with it the whole model fallback chain) instead of failing the turn.
    if (payload.error) {
      const message = payload.error.message ?? 'unknown error'
      const upstreamDetail =
        typeof payload.error.metadata?.raw === 'string' ? payload.error.metadata.raw : ''
      if (
        payload.error.code === 429 ||
        /rate.?limit|resource.?exhausted|quota|overloaded/i.test(`${message} ${upstreamDetail}`)
      ) {
        throw new LLMRateLimitError()
      }
      throw new LLMProviderError(`OpenRouter error: ${message}`)
    }

    const content = payload.choices?.[0]?.message?.content
    if (!content) {
      throw new LLMResponseParseError('OpenRouter returned an empty response')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(stripCodeFence(content))
    } catch {
      throw new LLMResponseParseError('OpenRouter response content was not valid JSON')
    }

    return normalizeAgainstSchema(parsed, params.responseSchema) as T
  }
}
