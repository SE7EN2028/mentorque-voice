import type { ResumeParser } from './resume-parser.js'
import { UnpdfResumeParser } from './unpdf-resume-parser.js'

let parser: ResumeParser | undefined

/** Single seam for swapping the resume parser implementation — every call
 * site depends on the ResumeParser interface, never on unpdf directly. */
export function getResumeParser(): ResumeParser {
  parser ??= new UnpdfResumeParser()
  return parser
}
