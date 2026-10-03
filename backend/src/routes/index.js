import { Router } from 'express';
import authRoutes from './authRoutes.js';

const router = Router();

// Mount authentication routes under /api/auth
router.use('/auth', authRoutes);

export default router;
