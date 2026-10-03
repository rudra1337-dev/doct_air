import { Router } from 'express';
import {
  register,
  login,
  getMe,
  logout,
} from '../controllers/authController.js';
import {
  validateRegister,
  validateLogin,
} from '../validators/authValidator.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = Router();

// Public auth endpoints
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);

// Authenticated session endpoint
router.get('/me', authenticateUser, getMe);

export default router;
