import asyncHandler from '../utils/asyncHandler.js';
import { registerUser, loginUser } from '../services/authService.js';
import { generateToken, setAuthCookie, clearAuthCookie } from '../utils/token.js';

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (strictly PATIENT role)
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const user = await registerUser({ name, email, password });
  const token = generateToken(user);
  setAuthCookie(res, token);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    user: user.toSafeObject(),
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & establish session cookie
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await loginUser({ email, password });
  const token = generateToken(user);
  setAuthCookie(res, token);

  res.status(200).json({
    success: true,
    message: 'Signed in successfully',
    user: user.toSafeObject(),
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Return currently authenticated user session
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user.toSafeObject ? req.user.toSafeObject() : req.user,
  });
});

/**
 * @route   POST /api/auth/logout
 * @desc    Clear session cookie and terminate session
 * @access  Public / Private
 */
export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    message: 'Signed out successfully',
  });
});
