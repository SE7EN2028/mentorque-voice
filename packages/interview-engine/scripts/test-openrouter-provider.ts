/**
 * Unit-level proof of OpenRouterProvider's request/response handling and
 * error mapping — exercised against a faked global fetch, independent of
 * any real network call. Run with `npm run test:openrouter`.
 */
import assert from 'node:assert/strict'
import { LLMProviderError, LLMRateLimitError, LLMResponseParseError } from '../src/llm/errors.js'
import type { GenerateStructuredParams, ValidationResult } from '../src/llm/llm-provider.js'
import { OpenRouterProvider } from '../src/llm/openrouter-provider.js'

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
  const provider = new OpenRouterProvider('test-key')
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
  console.log('✔ parses a well-formed OpenRouter response')
}

async function testStripsMarkdownCodeFence() {
  const provider = new OpenRouterProvider('test-key')
  const fenced = '```json\n{"ok":true,"value":"fenced"}\n```'
  const result = await withFakeFetch(
    () => Promise.resolve(fakeResponse(200, { choices: [{ message: { content: fenced } }] })),
    () => provider.generateStructured({ ...baseParams, validate }),
  )
  assert.deepEqual(result, { ok: true, value: 'fenced' })
  console.log('✔ strips a markdown code fence some models wrap JSON in')
}

async function testMapsHttp429ToRateLimitError() {
  const provider = new OpenRouterProvider('test-key')
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

async function testMapsInBody429ToRateLimitError() {
  const provider = new OpenRouterProvider('test-key')
  await assert.rejects(
    () =>
      withFakeFetch(
        () => Promise.resolve(fakeResponse(200, { error: { message: 'rate limited', code: 429 } })),
        () => provider.generateStructured({ ...baseParams, validate }),
      ),
    LLMRateLimitError,
  )
  console.log('✔ maps a 200-with-error-body rate limit to LLMRateLimitError')
}

async function testMapsHttp401ToProviderError() {
  const provider = new OpenRouterProvider('bad-key')
  await assert.rejects(
    () =>
      withFakeFetch(
        () => Promise.resolve(fakeResponse(401, { error: { message: 'invalid api key' } })),
        () => provider.generateStructured({ ...baseParams, validate }),
      ),
    LLMProviderError,
  )
  console.log('✔ maps HTTP 401 to LLMProviderError')
}

async function testMapsNetworkFailureToProviderError() {
  const provider = new OpenRouterProvider('test-key')
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
  // Real bug found via live verification: deepseek-chat (and likely other
  // OpenRouter models without Gemini's structural schema enforcement) emits
  // `null` for an empty array field instead of `[]`. The caller's Zod schema
  // uses `.default([])`, which only covers an absent key, not an explicit
  // null — so this used to fail validation on both the initial attempt and
  // the retry, throwing LLMResponseParseError on every single turn where the
  // model considered a list field empty.
  const provider = new OpenRouterProvider('test-key')
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
  const provider = new OpenRouterProvider('test-key')
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
  const provider = new OpenRouterProvider('test-key')
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
  await testStripsMarkdownCodeFence()
  await testMapsHttp429ToRateLimitError()
  await testMapsInBody429ToRateLimitError()
  await testMapsHttp401ToProviderError()
  await testMapsNetworkFailureToProviderError()
  await testNormalizesNullArrayToEmptyArray()
  await testMapsMalformedJsonToParseError()
  await testMapsEmptyResponseToParseError()
  console.log('\nOpenRouterProvider behavior verified.')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
