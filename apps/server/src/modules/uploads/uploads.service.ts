import { AppError } from '../../lib/errors.js'
import { logger } from '../../lib/logger.js'
import { getResumeParser } from './resume-parser.factory.js'

// Matches the resumeContext length cap in the shared createSessionSchema —
// keeps a pathological PDF from bloating storage or, later, prompt context.
const MAX_RESUME_TEXT_LENGTH = 20_000

export const uploadsService = {
  async extractResumeText(fileBuffer: Buffer): Promise<string> {
    let text: string
    try {
      text = await getResumeParser().extractText(fileBuffer)
    } catch (error) {
      logger.warn('resume PDF extraction failed', { error })
      throw new AppError(400, 'Could not read text from that PDF. Try a different file.')
    }

    if (!text) {
      throw new AppError(400, 'No readable text found in that PDF.')
    }

    return text.slice(0, MAX_RESUME_TEXT_LENGTH)
  },
}
