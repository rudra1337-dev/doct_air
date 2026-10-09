import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import conversationRoutes from '../modules/conversation/conversation.routes.js';
import { attachmentRoutes } from '../modules/attachment/index.js';
import { caseRoutes } from '../modules/case/index.js';

const router = Router();

// Mount feature routers
router.use('/auth', authRoutes);
router.use('/conversations', conversationRoutes);
router.use('/attachments', attachmentRoutes);
router.use('/cases', caseRoutes);

export default router;
