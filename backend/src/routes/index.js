import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import conversationRoutes from '../modules/conversation/conversation.routes.js';

const router = Router();

// Mount feature routers
router.use('/auth', authRoutes);
router.use('/conversations', conversationRoutes);

export default router;
