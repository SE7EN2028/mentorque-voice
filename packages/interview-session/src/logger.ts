/**
 * Minimal logging seam, same pattern as apps/server's — kept as its own
 * tiny copy rather than a shared dependency since logging has no identity
 * constraints (unlike errors, where two classes with the same shape are
 * still not `instanceof`-compatible across packages).
 */
export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.log(`[info] ${message}`, meta ?? '')
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(`[warn] ${message}`, meta ?? '')
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(`[error] ${message}`, meta ?? '')
  },
}
