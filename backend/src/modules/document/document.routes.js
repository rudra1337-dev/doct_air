import { Router } from 'express';
import {
  uploadDocumentHandler,
  getConversationDocumentsHandler,
  deleteDocumentHandler,
} from './document.controller.js';
import {
  validateConversationIdParam,
  validateDeleteDocumentParams,
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
  .delete(validateDeleteDocumentParams, deleteDocumentHandler);

export default router;
