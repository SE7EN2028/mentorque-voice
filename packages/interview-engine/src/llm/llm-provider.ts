import type { JsonSchemaNode } from './json-schema.js'

export interface LLMMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface GenerateStructuredParams {
  systemInstruction: string
  messages: LLMMessage[]
  responseSchema: JsonSchemaNode
}

/**
 * The only thing the conversation engine knows about "the model." Swapping
 * Gemini for OpenAI or Claude later means writing a new class here — the
 * engine, prompt builder, and everything upstream never change.
 */
export interface LLMProvider {
  generateStructured<T>(params: GenerateStructuredParams): Promise<T>
}
