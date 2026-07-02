export class LLMRateLimitError extends Error {
  constructor(message = 'LLM provider rate limit exceeded') {
    super(message)
    this.name = 'LLMRateLimitError'
  }
}

export class LLMResponseParseError extends Error {
  constructor(message = 'LLM provider returned a response that was not valid JSON') {
    super(message)
    this.name = 'LLMResponseParseError'
  }
}
