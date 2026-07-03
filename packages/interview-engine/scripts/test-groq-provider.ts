/**
 * Unit-level proof of GroqProvider's request/response handling and error
 * mapping — exercised against a faked global fetch, independent of any real
 * network call. Run with `npm run test:groq`.
 */
import assert from 'node:assert/strict'
import { LLMProviderError, LLMRateLimitError, LLMResponseParseError } from '../src/llm/errors.js'
import type { GenerateStructuredParams, ValidationResult } from '../src/llm/llm-provider.js'
import { GroqProvider } from '../src/llm/groq-provider.js'

interface Shape {
  ok: true
  value: string
}

interface ShapeWithList {
  tags: string[]
}

function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response
}

const baseParams: Omit<GenerateStructuredParams<Shape>, 'validate'> = {
  systemInstruction: 'be a good interviewer',
  messages: [{ role: 'user', content: 'hello' }],
  responseSchema: {
    type: 'object',
    required: ['ok', 'value'],
    properties: { ok: { type: 'boolean' }, value: { type: 'string' } },
  },
}

function validate(value: unknown): ValidationResult<Shape> {
  if (value && typeof value === 'object' && 'ok' in value) {
    return { success: true, data: value as Shape }
  }
  return { success: false }
}

async function withFakeFetch<T>(impl: typeof fetch, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch
  globalThis.fetch = impl
  try {
    return await run()
  } finally {
    globalThis.fetch = original
  }
}

async function testParsesSuccessfulResponse() {
  const provider = new GroqProvider('test-key')
  const result = await withFakeFetch(
    () =>
      Promise.resolve(
        fakeResponse(200, {
          choices: [{ message: { content: JSON.stringify({ ok: true, value: 'hi' }) } }],
        }),
      ),
    () => provider.generateStructured({ ...baseParams, validate }),
  )
  assert.deepEqual(result, { ok: true, value: 'hi' })
  console.log('✔ parses a well-formed Groq response')
}

async function testSendsAuthAndJsonMode() {
  let captured: { url?: string; init?: RequestInit } = {}
  const provider = new GroqProvider('test-key', 'llama-3.3-70b-versatile')
  await withFakeFetch(
    (url, init) => {
      captured = { url: String(url), init }
      return Promise.resolve(
        fakeResponse(200, {
          choices: [{ message: { content: '{"ok":true,"value":"x"}' } }],
        }),
      )
    },
    () => provider.generateStructured({ ...baseParams, validate }),
  )
  assert.equal(captured.url, 'https://api.groq.com/openai/v1/chat/completions')
  const headers = captured.init?.headers as Record<string, string>
  assert.equal(headers.Authorization, 'Bearer test-key')
  const body = JSON.parse(String(captured.init?.body)) as {
    model: string
    response_format: { type: string }
    messages: Array<{ role: string; content: string }>
  }
  assert.equal(body.model, 'llama-3.3-70b-versatile')
  assert.deepEqual(body.response_format, { type: 'json_object' })
  assert.match(body.messages[0]!.content, /JSON Schema/)
  console.log('✔ sends bearer auth, model, json_object mode, and schema-in-prompt')
}

async function testStripsMarkdownCodeFence() {
  const provider = new GroqProvider('test-key')
  const fenced = '```json\n{"ok":true,"value":"fenced"}\n```'
  const result = await withFakeFetch(
    () => Promise.resolve(fakeResponse(200, { choices: [{ message: { content: fenced } }] })),
    () => provider.generateStructured({ ...baseParams, validate }),
  )
  assert.deepEqual(result, { ok: true, value: 'fenced' })
  console.log('✔ strips a markdown code fence some models wrap JSON in')
}

async function testMapsHttp429ToRateLimitError() {
  const provider = new GroqProvider('test-key')
  await assert.rejects(
    () =>
      withFakeFetch(
        () => Promise.resolve(fakeResponse(429, { error: { message: 'rate limited' } })),
        () => provider.generateStructured({ ...baseParams, validate }),
      ),
    LLMRateLimitError,
  )
  console.log('✔ maps HTTP 429 to LLMRateLimitError')
}

async function testMapsInBodyRateLimitToRateLimitError() {
  const provider = new GroqProvider('test-key')
  await assert.rejects(
    () =>
      withFakeFetch(
        () =>
          Promise.resolve(
            fakeResponse(200, { error: { message: 'Rate limit reached for model' } }),
          ),
        () => provider.generateStructured({ ...baseParams, validate }),
      ),
    LLMRateLimitError,
  )
  console.log('✔ maps a 200-with-rate-limit-error-body to LLMRateLimitError')
}

async function testMapsHttp401ToProviderError() {
  const provider = new GroqProvider('bad-key')
  await assert.rejects(
    () =>
      withFakeFetch(
        () => Promise.resolve(fakeResponse(401, { error: { message: 'invalid api key' } })),
        () => provider.generateStructured({ ...baseParams, validate }),
      ),
    /check GROQ_API_KEY/,
  )
  console.log('✔ maps HTTP 401 to LLMProviderError naming GROQ_API_KEY')
}

async function testMapsHttp404ToModelHint() {
  const provider = new GroqProvider('test-key', 'not-a-model')
  await assert.rejects(
    () =>
      withFakeFetch(
        () => Promise.resolve(fakeResponse(404, { error: { message: 'model not found' } })),
        () => provider.generateStructured({ ...baseParams, validate }),
      ),
    /GROQ_MODEL/,
  )
  console.log('✔ maps HTTP 404 to LLMProviderError with GROQ_MODEL switch hint')
}

async function testMapsJsonValidateFailedToParseError() {
  const provider = new GroqProvider('test-key')
  await assert.rejects(
    () =>
      withFakeFetch(
        () =>
          Promise.resolve(
            fakeResponse(400, {
              error: {
                message: 'json validation failed',
                code: 'json_validate_failed',
                failed_generation: '{broken',
              },
            }),
          ),
        () => provider.generateStructured({ ...baseParams, validate }),
      ),
    LLMResponseParseError,
  )
  console.log('✔ maps a 400 json_validate_failed to LLMResponseParseError (validation retry path)')
}

async function testMaps5xxToProviderError() {
  const provider = new GroqProvider('test-key')
  await assert.rejects(
    () =>
      withFakeFetch(
        () => Promise.resolve(fakeResponse(503, { error: { message: 'over capacity' } })),
        () => provider.generateStructured({ ...baseParams, validate }),
      ),
    LLMProviderError,
  )
  console.log('✔ maps a 5xx to LLMProviderError')
}

async function testMapsTimeoutToProviderError() {
  const provider = new GroqProvider('test-key')
  const timeoutError = new Error('The operation was aborted due to timeout')
  timeoutError.name = 'TimeoutError'
  await assert.rejects(
    () =>
      withFakeFetch(
        () => Promise.reject(timeoutError),
        () => provider.generateStructured({ ...baseParams, validate }),
      ),
    /timed out/,
  )
  console.log('✔ maps an AbortSignal timeout to LLMProviderError')
}

async function testMapsNetworkFailureToProviderError() {
  const provider = new GroqProvider('test-key')
  await assert.rejects(
    () =>
      withFakeFetch(
        () => Promise.reject(new Error('getaddrinfo ENOTFOUND')),
        () => provider.generateStructured({ ...baseParams, validate }),
      ),
    LLMProviderError,
  )
  console.log('✔ maps a network failure to LLMProviderError')
}

async function testNormalizesNullArrayToEmptyArray() {
  const provider = new GroqProvider('test-key')
  const listValidate = (value: unknown) => ({ success: true, data: value as ShapeWithList })
  const result = await withFakeFetch(
    () =>
      Promise.resolve(fakeResponse(200, { choices: [{ message: { content: '{"tags":null}' } }] })),
    () =>
      provider.generateStructured({
        systemInstruction: 'be a good interviewer',
        messages: [{ role: 'user', content: 'hello' }],
        responseSchema: {
          type: 'object',
          required: ['tags'],
          properties: { tags: { type: 'array', items: { type: 'string' } } },
        },
        validate: listValidate,
      }),
  )
  assert.deepEqual(result, { tags: [] })
  console.log('✔ normalizes a null array-typed field to [] before returning')
}

async function testMapsMalformedJsonToParseError() {
  const provider = new GroqProvider('test-key')
  await assert.rejects(
    () =>
      withFakeFetch(
        () =>
          Promise.resolve(fakeResponse(200, { choices: [{ message: { content: 'not json' } }] })),
        () => provider.generateStructured({ ...baseParams, validate }),
      ),
    LLMResponseParseError,
  )
  console.log('✔ maps unparseable content to LLMResponseParseError')
}

async function testMapsEmptyResponseToParseError() {
  const provider = new GroqProvider('test-key')
  await assert.rejects(
    () =>
      withFakeFetch(
        () => Promise.resolve(fakeResponse(200, { choices: [] })),
        () => provider.generateStructured({ ...baseParams, validate }),
      ),
    LLMResponseParseError,
  )
  console.log('✔ maps an empty choices array to LLMResponseParseError')
}

async function main() {
  await testParsesSuccessfulResponse()
  await testSendsAuthAndJsonMode()
  await testStripsMarkdownCodeFence()
  await testMapsHttp429ToRateLimitError()
  await testMapsInBodyRateLimitToRateLimitError()
  await testMapsHttp401ToProviderError()
  await testMapsHttp404ToModelHint()
  await testMapsJsonValidateFailedToParseError()
  await testMaps5xxToProviderError()
  await testMapsTimeoutToProviderError()
  await testMapsNetworkFailureToProviderError()
  await testNormalizesNullArrayToEmptyArray()
  await testMapsMalformedJsonToParseError()
  await testMapsEmptyResponseToParseError()
  console.log('\nGroqProvider behavior verified.')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
