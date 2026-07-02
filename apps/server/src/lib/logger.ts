/**
 * Minimal logging seam. Swap the implementation for pino/winston later
 * without touching any call site.
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
