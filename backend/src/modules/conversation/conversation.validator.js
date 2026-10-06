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
    .isString()
    .withMessage('Message content must be text')
    .trim()
    .notEmpty()
    .withMessage('Message content cannot be empty')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message content cannot exceed 10000 characters'),

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
    .isIn(['text'])
    .withMessage('Only "text" input mode is currently supported'),

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
