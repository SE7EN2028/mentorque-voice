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

/** Transport-level failures that aren't rate-limiting and aren't a bad
 * response body — auth rejections (401/403), network timeouts, and other
 * non-2xx HTTP failures. Distinct from LLMResponseParseError (which means
 * "got a response, but couldn't use it") so callers that care can tell the
 * two apart, even though both currently fall into ValidatingProvider's same
 * generic retry-once bucket. */
export class LLMProviderError extends Error {
  constructor(message = 'LLM provider request failed') {
    super(message)
    this.name = 'LLMProviderError'
  }
}
