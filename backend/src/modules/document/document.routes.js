import { Router } from 'express';
import {
  uploadDocumentHandler,
  getConversationDocumentsHandler,
  getDocumentHandler,
  retryDocumentProcessingHandler,
  deleteDocumentHandler,
} from './document.controller.js';
import {
  validateConversationIdParam,
  validateDocumentIdParams,
} from './document.validator.js';
import { uploadPdfMiddleware } from './document.upload.js';
import { authenticateUser } from '../../middleware/authMiddleware.js';

const router = Router({ mergeParams: true });

// All document routes require authentication
router.use(authenticateUser);

router
  .route('/')
  .get(validateConversationIdParam, getConversationDocumentsHandler)
  .post(validateConversationIdParam, uploadPdfMiddleware, uploadDocumentHandler);

router
  .route('/:documentId')
  .get(validateDocumentIdParams, getDocumentHandler)
  .delete(validateDocumentIdParams, deleteDocumentHandler);

router
  .route('/:documentId/retry')
  .post(validateDocumentIdParams, retryDocumentProcessingHandler);

export default router;
