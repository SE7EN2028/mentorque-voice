/**
 * Abstraction over "turn a PDF's bytes into plain text" — the only thing the
 * rest of the app depends on. Swapping unpdf for another parser later means
 * writing a new class here and changing one line in getResumeParser();
 * nothing else in the codebase needs to know.
 */
export interface ResumeParser {
  extractText(fileBuffer: Buffer): Promise<string>
}
