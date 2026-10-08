import asyncHandler from '../../utils/asyncHandler.js';
import * as attachmentService from './attachment.service.js';

/**
 * Handle multipart draft PDF upload
 * POST /api/attachments/draft
 */
export const uploadDraftAttachmentHandler = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const conversationId = req.body?.conversationId || req.query?.conversationId || null;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No PDF file was uploaded. Please attach a PDF document.',
    });
  }

  const draft = await attachmentService.createDraftAttachment({
    userId,
    conversationId,
    file: req.file,
  });

  res.status(201).json({
    success: true,
    message: 'Draft attachment uploaded successfully.',
    attachment: draft,
  });
});

/**
 * Handle draft attachment retrieval
 * GET /api/attachments/draft/:attachmentId
 */
export const getDraftAttachmentHandler = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { attachmentId } = req.params;

  const draft = await attachmentService.getDraftAttachment({
    attachmentId,
    userId,
  });

  res.status(200).json({
    success: true,
    attachment: draft,
  });
});

/**
 * Handle draft attachment deletion
 * DELETE /api/attachments/draft/:attachmentId
 */
export const deleteDraftAttachmentHandler = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { attachmentId } = req.params;

  await attachmentService.deleteDraftAttachment({
    attachmentId,
    userId,
  });

  res.status(200).json({
    success: true,
    message: 'Draft attachment deleted successfully.',
  });
});
