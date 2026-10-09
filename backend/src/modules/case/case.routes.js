import { Router } from 'express';
import {
  createCaseHandler,
  getCaseHandler,
  getCaseByConversationHandler,
  updateCaseHandler,
  updateCaseStatusHandler,
  extractCaseHandler,
  extractDocumentCaseHandler,
} from './case.controller.js';
import {
  validateCaseIdParam,
  validateConversationIdParam,
  validateCreateCase,
  validateUpdateCase,
  validateUpdateCaseStatus,
  validateDocumentAndConversationParams,
} from './case.validator.js';
import { authenticateUser } from '../../middleware/authMiddleware.js';

const router = Router({ mergeParams: true });

// All case routes require authentication
router.use(authenticateUser);

router
  .route('/')
  .post(validateCreateCase, createCaseHandler);

router
  .route('/conversation/:conversationId')
  .get(validateConversationIdParam, getCaseByConversationHandler);

router
  .route('/conversation/:conversationId/extract')
  .post(validateConversationIdParam, extractCaseHandler);

router
  .route('/conversation/:conversationId/documents/:documentId/extract')
  .post(validateDocumentAndConversationParams, extractDocumentCaseHandler);

router
  .route('/:id')
  .get(validateCaseIdParam, getCaseHandler)
  .patch(validateUpdateCase, updateCaseHandler);

router
  .route('/:id/status')
  .patch(validateUpdateCaseStatus, updateCaseStatusHandler);

export default router;
