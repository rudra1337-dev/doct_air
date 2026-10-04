import { Router } from 'express';
import {
  register,
  login,
  getMe,
  logout,
} from './auth.controller.js';
import {
  validateRegister,
  validateLogin,
} from './auth.validator.js';
import { authenticateUser } from '../../middleware/authMiddleware.js';

const router = Router();

// Public authentication endpoints
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);

// Authenticated session endpoint
router.get('/me', authenticateUser, getMe);

export default router;
