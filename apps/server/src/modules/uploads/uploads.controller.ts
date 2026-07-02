import type { Request, Response } from 'express'
import { AppError } from '../../lib/errors.js'
import { uploadsService } from './uploads.service.js'

export const uploadsController = {
  async uploadResume(req: Request, res: Response) {
    if (!req.file) {
      throw new AppError(400, 'No file uploaded')
    }
    const resumeText = await uploadsService.extractResumeText(req.file.buffer)
    res.status(200).json({ resumeText })
  },
}
