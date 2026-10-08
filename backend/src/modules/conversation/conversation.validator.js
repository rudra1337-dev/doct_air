import { body, param } from 'express-validator';
import { validate } from '../../middleware/validateMiddleware.js';

/**
 * Validation rules for creating a conversation
 */
export const validateCreateConversation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Title must be between 1 and 120 characters'),

  validate,
];

/**
 * Validation rules for getting messages of a conversation
 */
export const validateGetMessages = [
  param('conversationId')
    .trim()
    .notEmpty()
    .withMessage('Conversation ID is required')
    .isMongoId()
    .withMessage('Invalid conversation ID format'),

  validate,
];

/**
 * Validation rules for posting a message to a conversation
 */
export const validateCreateMessage = [
  param('conversationId')
    .trim()
    .notEmpty()
    .withMessage('Conversation ID is required')
    .isMongoId()
    .withMessage('Invalid conversation ID format'),

  body('content')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Message content must be text')
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Message content cannot exceed 10000 characters'),

  body().custom((_value, { req }) => {
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    const attachments = req.body?.attachments || req.body?.attachmentIds;
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if (!content && !hasAttachments) {
      throw new Error('Message must contain text content or at least one attachment');
    }
    return true;
  }),

  body('attachments')
    .optional()
    .isArray()
    .withMessage('attachments must be an array of attachment IDs')
    .custom((val) => {
      for (const id of val) {
        if (typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
          throw new Error('All attachments must be valid Mongo ID strings');
        }
      }
      return true;
    }),

  body('attachmentIds')
    .optional()
    .isArray()
    .withMessage('attachmentIds must be an array of attachment IDs')
    .custom((val) => {
      for (const id of val) {
        if (typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
          throw new Error('All attachmentIds must be valid Mongo ID strings');
        }
      }
      return true;
    }),

  body('documentIds')
    .optional()
    .isArray()
    .withMessage('documentIds must be an array of document IDs')
    .custom((val) => {
      for (const id of val) {
        if (typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
          throw new Error('All documentIds must be valid Mongo ID strings');
        }
      }
      return true;
    }),

  body('role')
    .optional()
    .custom((value) => {
      if (value !== 'user') {
        throw new Error('Invalid message role. Clients may only post messages as "user"');
      }
      return true;
    }),

  body('inputMode')
    .optional()
    .isIn(['text', 'voice'])
    .withMessage('Only "text" and "voice" input modes are supported'),

  body('stream')
    .optional()
    .custom((val) => {
      if (typeof val !== 'boolean' && val !== 'true' && val !== 'false') {
        throw new Error('Stream parameter must be a boolean');
      }
      return true;
    }),

  validate,
];
