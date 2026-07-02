import type { JsonSchemaNode } from './json-schema.js'

export interface LLMMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ValidationResult<T> {
  success: boolean
  data?: T
}

export interface GenerateStructuredParams<T> {
  systemInstruction: string
  messages: LLMMessage[]
  responseSchema: JsonSchemaNode
  /** Checks whether a parsed response is actually usable — typically a
   * Zod schema's safeParse. The provider layer (ValidatingProvider) uses
   * this to decide whether to retry, without ever needing to know what
   * "valid" means for any particular caller. A plain GeminiProvider ignores
   * this field entirely; it exists for the decorator that wraps it. */
  validate: (value: unknown) => ValidationResult<T>
}

/**
 * The only thing the conversation engine knows about "the model." Swapping
 * Gemini for OpenAI or Claude later means writing a new class here — the
 * engine, prompt builder, and everything upstream never change.
 */
export interface LLMProvider {
  generateStructured<T>(params: GenerateStructuredParams<T>): Promise<T>
}
