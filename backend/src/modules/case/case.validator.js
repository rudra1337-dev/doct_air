import { body, param } from 'express-validator';
import { validate } from '../../middleware/validateMiddleware.js';

/**
 * Validation rules for caseId URL parameter (:id)
 */
export const validateCaseIdParam = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Case ID is required')
    .isMongoId()
    .withMessage('Invalid case ID format'),

  validate,
];

/**
 * Validation rules for conversationId URL parameter (:conversationId)
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
 * Validation rules for creating/initializing a case
 */
export const validateCreateCase = [
  body('conversationId')
    .optional()
    .trim()
    .isMongoId()
    .withMessage('Invalid conversation ID format in request body'),

  param('conversationId')
    .optional()
    .trim()
    .isMongoId()
    .withMessage('Invalid conversation ID format in URL parameter'),

  // Custom check: conversationId must be supplied in either param or body
  (req, res, next) => {
    const convId = req.params?.conversationId || req.body?.conversationId;
    if (!convId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required to initialize a case',
      });
    }
    next();
  },

  validate,
];

/**
 * Validation rules for updating permitted case fields
 */
export const validateUpdateCase = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Case ID is required')
    .isMongoId()
    .withMessage('Invalid case ID format'),

  // Prevent client from mutating ownership or conversation relationship
  body('patientId')
    .optional()
    .custom((_value) => {
      throw new Error('Changing patientId is not permitted');
    }),

  body('conversationId')
    .optional()
    .custom((_value) => {
      throw new Error('Changing conversationId is not permitted');
    }),

  body('status')
    .optional()
    .isIn(['in_progress', 'ready_for_review', 'reviewed'])
    .withMessage('Status must be in_progress, ready_for_review, or reviewed'),

  body('chiefComplaint.text')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Chief complaint text cannot exceed 500 characters'),

  body('symptoms')
    .optional()
    .isArray()
    .withMessage('Symptoms must be an array'),

  body('symptoms.*.name')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Symptom name cannot exceed 200 characters'),

  body('medications')
    .optional()
    .isArray()
    .withMessage('Medications must be an array'),

  body('allergies')
    .optional()
    .isArray()
    .withMessage('Allergies must be an array'),

  body('vitals')
    .optional()
    .isArray()
    .withMessage('Vitals must be an array'),

  body('onset.value')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Onset description cannot exceed 200 characters'),

  body('duration.value')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Duration description cannot exceed 200 characters'),

  body('severity.value')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Severity description cannot exceed 100 characters'),

  body('symptomLocation.value')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Symptom location description cannot exceed 200 characters'),

  body('relevantMedicalHistory')
    .optional()
    .isArray()
    .withMessage('Relevant medical history must be an array'),

  body('associatedSymptoms')
    .optional()
    .isArray()
    .withMessage('Associated symptoms must be an array'),

  validate,
];

/**
 * Validation rules for updating case status
 */
export const validateUpdateCaseStatus = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Case ID is required')
    .isMongoId()
    .withMessage('Invalid case ID format'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['in_progress', 'ready_for_review', 'reviewed'])
    .withMessage('Status must be in_progress, ready_for_review, or reviewed'),

  validate,
];

/**
 * Validation rules for conversationId and documentId URL parameters
 */
export const validateDocumentAndConversationParams = [
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
  validateCaseIdParam,
  validateConversationIdParam,
  validateCreateCase,
  validateUpdateCase,
  validateUpdateCaseStatus,
  validateDocumentAndConversationParams,
};
