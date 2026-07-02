import { extractText, getDocumentProxy } from 'unpdf'
import type { ResumeParser } from './resume-parser.js'

export class UnpdfResumeParser implements ResumeParser {
  async extractText(fileBuffer: Buffer): Promise<string> {
    const pdf = await getDocumentProxy(new Uint8Array(fileBuffer))
    const { text } = await extractText(pdf, { mergePages: true })
    return text.trim()
  }
}
