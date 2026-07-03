import type { JsonSchemaNode } from './json-schema.js'

/**
 * Shared helpers for providers that speak the OpenAI-compatible chat API
 * (OpenRouter, Groq) and carry the response schema as prompt text rather
 * than as an enforced parameter. GeminiProvider has its own dialect
 * (toGeminiSchema) and does not use these.
 */

// Converts our provider-agnostic schema into a standard JSON Schema object —
// the mirror of what GeminiProvider's toGeminiSchema does for Gemini's own
// dialect.
export function toJsonSchema(node: JsonSchemaNode): Record<string, unknown> {
  const schema: Record<string, unknown> = { type: node.nullable ? [node.type, 'null'] : node.type }

  if (node.description) schema.description = node.description
  if (node.enum) schema.enum = node.enum
  if (node.required) schema.required = node.required
  if (node.items) schema.items = toJsonSchema(node.items)
  if (node.properties) {
    schema.properties = Object.fromEntries(
      Object.entries(node.properties).map(([key, value]) => [key, toJsonSchema(value)]),
    )
    schema.additionalProperties = false
  }

  return schema
}

// Most open-weight chat models don't reliably honor `response_format:
// json_schema` the way Gemini honors responseSchema, so the contract is
// carried a second, more portable way too: spelled out as JSON Schema text
// appended to the system prompt. json_object mode still guarantees
// syntactically valid JSON; this is what tells the model which fields to
// put in it.
export function buildSchemaInstruction(schema: JsonSchemaNode): string {
  return [
    '',
    'Respond with ONLY a single JSON object — no markdown, no code fences, no commentary —',
    'matching exactly this JSON Schema:',
    JSON.stringify(toJsonSchema(schema)),
  ].join('\n')
}

export function stripCodeFence(text: string): string {
  const trimmed = text.trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed)
  return fenced ? (fenced[1] ?? trimmed) : trimmed
}

// Gemini's structural schema enforcement never lets an array-typed field
// come back as null — it's coerced to `[]` at the API level before the
// provider ever sees it. Prompt-carried schema adherence is not enforced,
// and models routinely emit `null` for "no items" instead of `[]`. The
// caller's Zod schema uses `.default([])`, which only applies to an absent
// key, not an explicit null, so this normalizes the parsed value against our
// own schema before handing it back — the same kind of dialect
// reconciliation toGeminiSchema does for the request side, just for the
// response side instead.
export function normalizeAgainstSchema(value: unknown, schema: JsonSchemaNode): unknown {
  if (schema.type === 'array') {
    if (value == null) return []
    if (!Array.isArray(value)) return value
    const itemSchema = schema.items
    return itemSchema ? value.map((item) => normalizeAgainstSchema(item, itemSchema)) : value
  }

  if (schema.type === 'object' && schema.properties && value && typeof value === 'object') {
    const result: Record<string, unknown> = { ...(value as Record<string, unknown>) }
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in result) {
        result[key] = normalizeAgainstSchema(result[key], propSchema)
      }
    }
    return result
  }

  return value
}
