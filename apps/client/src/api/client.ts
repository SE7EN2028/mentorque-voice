export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const API_URL = import.meta.env.VITE_API_URL

/** Thin fetch wrapper: always sends the auth cookie, normalizes non-2xx
 * responses into a typed ApiError, and JSON-encodes by default — unless the
 * body is FormData (file upload), in which case the browser sets its own
 * multipart Content-Type with the correct boundary. */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const body: unknown = isJson ? await response.json() : null

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : 'Something went wrong. Please try again.'
    throw new ApiError(response.status, message)
  }

  return body as T
}
