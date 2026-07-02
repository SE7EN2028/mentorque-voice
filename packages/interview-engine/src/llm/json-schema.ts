/**
 * Minimal, provider-agnostic JSON-schema representation — just enough to
 * describe the structured output we need. The Prompt Builder produces this;
 * each LLMProvider adapts it into its own API's schema dialect internally.
 * Not a full JSON-Schema implementation on purpose.
 */
export type JsonSchemaPrimitive = 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array'

export interface JsonSchemaNode {
  type: JsonSchemaPrimitive
  description?: string
  enum?: string[]
  nullable?: boolean
  properties?: Record<string, JsonSchemaNode>
  required?: string[]
  /** Field generation order — several structured-output APIs (Gemini
   * included) generate JSON fields in schema-declared order, which is used
   * deliberately elsewhere to make the model commit to a decision before
   * generating the text conditioned on it. */
  propertyOrder?: string[]
  items?: JsonSchemaNode
}
