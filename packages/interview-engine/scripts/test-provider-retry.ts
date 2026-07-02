/**
 * Unit-level proof of the "reject malformed responses, retry once" policy
 * — exercised directly against ValidatingProvider with a fake flaky inner
 * provider, independent of the full conversation-engine flow. Run with
 * `npm run test:retry`.
 */
import assert from 'node:assert/strict'
import { LLMResponseParseError } from '../src/llm/errors.js'
import type {
  GenerateStructuredParams,
  LLMProvider,
  ValidationResult,
} from '../src/llm/llm-provider.js'
import { ValidatingProvider } from '../src/llm/validating-provider.js'

interface Shape {
  ok: true
}

class FlakyProvider implements LLMProvider {
  private callIndex = 0
  constructor(private readonly outcomes: ('invalid' | 'valid')[]) {}

  async generateStructured<T>(_params: GenerateStructuredParams<T>): Promise<T> {
    const outcome = this.outcomes[this.callIndex]
    this.callIndex += 1
    if (outcome === 'valid') {
      return { ok: true } as T
    }
    return { unexpected: 'shape' } as T
  }

  get callCount(): number {
    return this.callIndex
  }
}

function validate(value: unknown): ValidationResult<Shape> {
  if (value && typeof value === 'object' && 'ok' in value && value.ok === true) {
    return { success: true, data: value as Shape }
  }
  return { success: false }
}

const baseParams = {
  systemInstruction: '',
  messages: [],
  responseSchema: { type: 'object' as const },
}

async function testRecoversOnRetry() {
  const flaky = new FlakyProvider(['invalid', 'valid'])
  const provider = new ValidatingProvider(flaky)

  const result = await provider.generateStructured({ ...baseParams, validate })

  assert.deepEqual(result, { ok: true })
  assert.equal(
    flaky.callCount,
    2,
    'should have called the inner provider twice: initial + one retry',
  )
  console.log('✔ recovers after one retry when the first attempt is invalid')
}

async function testThrowsAfterTwoFailures() {
  const flaky = new FlakyProvider(['invalid', 'invalid'])
  const provider = new ValidatingProvider(flaky)

  await assert.rejects(
    () => provider.generateStructured({ ...baseParams, validate }),
    LLMResponseParseError,
  )
  assert.equal(
    flaky.callCount,
    2,
    'should not retry a third time — retry-once means exactly two attempts total',
  )
  console.log('✔ throws a clear LLMResponseParseError after invalid output twice in a row')
}

async function testSucceedsFirstTryWithoutRetrying() {
  const flaky = new FlakyProvider(['valid', 'invalid'])
  const provider = new ValidatingProvider(flaky)

  const result = await provider.generateStructured({ ...baseParams, validate })

  assert.deepEqual(result, { ok: true })
  assert.equal(flaky.callCount, 1, 'a valid first attempt should not trigger any retry at all')
  console.log('✔ does not retry when the first attempt is already valid')
}

async function main() {
  await testSucceedsFirstTryWithoutRetrying()
  await testRecoversOnRetry()
  await testThrowsAfterTwoFailures()
  console.log('\nProvider retry behavior verified.')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
