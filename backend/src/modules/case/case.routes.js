import { Router } from 'express';
import {
  createCaseHandler,
  getCaseHandler,
  getCaseByConversationHandler,
  updateCaseHandler,
  updateCaseStatusHandler,
} from './case.controller.js';
import {
  validateCaseIdParam,
  validateConversationIdParam,
  validateCreateCase,
  validateUpdateCase,
  validateUpdateCaseStatus,
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
  .route('/:id')
  .get(validateCaseIdParam, getCaseHandler)
  .patch(validateUpdateCase, updateCaseHandler);

router
  .route('/:id/status')
  .patch(validateUpdateCaseStatus, updateCaseStatusHandler);

export default router;
