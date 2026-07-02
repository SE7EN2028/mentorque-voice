import { ApiError, GoogleGenAI, Type } from '@google/genai'
import { LLMRateLimitError, LLMResponseParseError } from './errors.js'
import type { JsonSchemaNode, JsonSchemaPrimitive } from './json-schema.js'
import type { GenerateStructuredParams, LLMProvider } from './llm-provider.js'

const TYPE_MAP: Record<JsonSchemaPrimitive, Type> = {
  object: Type.OBJECT,
  string: Type.STRING,
  number: Type.NUMBER,
  integer: Type.INTEGER,
  boolean: Type.BOOLEAN,
  array: Type.ARRAY,
}

// Gemini's structured-output schema is its own dialect (Type enum,
// propertyOrdering instead of relying on object key order) — this is the
// one place that dialect is spoken; nothing else in the codebase knows it.
function toGeminiSchema(node: JsonSchemaNode): Record<string, unknown> {
  const schema: Record<string, unknown> = { type: TYPE_MAP[node.type] }

  if (node.description) schema.description = node.description
  if (node.enum) schema.enum = node.enum
  if (node.nullable) schema.nullable = true
  if (node.required) schema.required = node.required
  if (node.propertyOrder) schema.propertyOrdering = node.propertyOrder
  if (node.items) schema.items = toGeminiSchema(node.items)
  if (node.properties) {
    schema.properties = Object.fromEntries(
      Object.entries(node.properties).map(([key, value]) => [key, toGeminiSchema(value)]),
    )
  }

  return schema
}

export class GeminiProvider implements LLMProvider {
  private readonly client: GoogleGenAI

  constructor(
    apiKey: string,
    private readonly model = 'gemini-2.5-flash',
  ) {
    this.client = new GoogleGenAI({ apiKey })
  }

  async generateStructured<T>(params: GenerateStructuredParams<T>): Promise<T> {
    const contents = params.messages.map((message) => ({
      role: message.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: message.content }],
    }))

    let response: Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>
    try {
      response = await this.client.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: toGeminiSchema(params.responseSchema),
        },
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        throw new LLMRateLimitError()
      }
      throw error
    }

    const text = response.text
    if (!text) {
      throw new LLMResponseParseError('Gemini returned an empty response')
    }

    try {
      return JSON.parse(text) as T
    } catch {
      throw new LLMResponseParseError('Gemini response was not valid JSON')
    }
  }
}
