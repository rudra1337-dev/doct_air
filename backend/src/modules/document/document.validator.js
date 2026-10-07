import { param } from 'express-validator';
import { validate } from '../../middleware/validateMiddleware.js';

/**
 * Validation rules for conversationId URL parameter
 */
export const validateConversationIdParam = [
  param('conversationId')
    .trim()
    .notEmpty()
    .withMessage('Conversation ID is required')
    .isMongoId()
    .withMessage('Invalid conversation ID format'),

  validate,
];

/**
 * Validation rules for documentId and conversationId URL parameters
 */
export const validateDeleteDocumentParams = [
  param('conversationId')
    .trim()
    .notEmpty()
    .withMessage('Conversation ID is required')
    .isMongoId()
    .withMessage('Invalid conversation ID format'),

  param('documentId')
    .trim()
    .notEmpty()
    .withMessage('Document ID is required')
    .isMongoId()
    .withMessage('Invalid document ID format'),

  validate,
];

export default {
  validateConversationIdParam,
  validateDeleteDocumentParams,
};
