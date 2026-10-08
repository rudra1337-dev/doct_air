import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import {
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_FILE_SIZE_MB,
  TEMP_ATTACHMENT_UPLOAD_DIR,
} from '../../config/env.js';

// Resolve and ensure temporary attachment upload directory exists
const absoluteTempDir = path.resolve(process.cwd(), TEMP_ATTACHMENT_UPLOAD_DIR);
if (!fs.existsSync(absoluteTempDir)) {
  fs.mkdirSync(absoluteTempDir, { recursive: true });
}

// Secure disk storage using random UUIDs for draft attachments
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, absoluteTempDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    const safeKey = `draft-${crypto.randomUUID()}${ext}`;
    cb(null, safeKey);
  },
});

// Strict PDF validator
const fileFilter = (_req, file, cb) => {
  const isPdfMime = file.mimetype === 'application/pdf';
  const hasPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';

  if (!isPdfMime || !hasPdfExt) {
    const error = new Error('Invalid file type. Only PDF documents are supported.');
    error.statusCode = 400;
    return cb(error, false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_DOCUMENT_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter,
});

/**
 * Express middleware wrapper for draft PDF upload
 * Accepts single file from 'file' or 'document' field name
 */
export const uploadDraftPdfMiddleware = (req, res, next) => {
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'document', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `This PDF is larger than the allowed file size of ${MAX_DOCUMENT_FILE_SIZE_MB}MB.`,
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed.',
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid file upload.',
      });
    }

    const uploadedFile = req.files?.file?.[0] || req.files?.document?.[0];

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'No PDF file was uploaded. Please attach a PDF document.',
      });
    }

    if (uploadedFile.size === 0) {
      if (uploadedFile.path && fs.existsSync(uploadedFile.path)) {
        try {
          fs.unlinkSync(uploadedFile.path);
        } catch {
          // ignore
        }
      }
      return res.status(400).json({
        success: false,
        message: 'Uploaded PDF file cannot be empty (0 bytes).',
      });
    }

    req.file = uploadedFile;
    next();
  });
};

export default uploadDraftPdfMiddleware;
