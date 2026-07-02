import { Router } from 'express'
import multer from 'multer'
import { AppError } from '../../lib/errors.js'
import { requireAuth } from '../../middleware/auth.js'
import { uploadsController } from './uploads.controller.js'

const upload = multer({
  storage: multer.memoryStorage(), // buffer only — the PDF is never written to disk
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== 'application/pdf') {
      callback(new AppError(400, 'Only PDF files are supported'))
      return
    }
    callback(null, true)
  },
})

export const uploadsRouter = Router()

uploadsRouter.post('/resume', requireAuth, upload.single('resume'), uploadsController.uploadResume)
