import { Router } from 'express';
import { authenticateUser } from '../../middleware/authMiddleware.js';
import uploadDraftPdfMiddleware from './attachment.upload.js';
import {
  uploadDraftAttachmentHandler,
  getDraftAttachmentHandler,
  deleteDraftAttachmentHandler,
} from './attachment.controller.js';

const router = Router();

// All attachment endpoints require authentication
router.use(authenticateUser);

router.post('/draft', uploadDraftPdfMiddleware, uploadDraftAttachmentHandler);
router.get('/draft/:attachmentId', getDraftAttachmentHandler);
router.delete('/draft/:attachmentId', deleteDraftAttachmentHandler);

export default router;
