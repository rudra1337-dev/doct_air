import { verifyToken } from '../utils/token.js';
import { COOKIE_NAME } from '../config/env.js';
import User from '../models/User.js';

/**
 * Middleware: Verify JWT from httpOnly cookie (or Bearer header) and attach authenticated user
 */
export const authenticateUser = async (req, res, next) => {
  try {
    let token = null;

    // 1. Prioritize secure httpOnly cookie
    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    }
    // 2. Fallback to Authorization: Bearer <token> header
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in.',
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session token.',
      });
    }

    // Fetch user from database
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Session expired or invalid. Please sign in again.',
    });
  }
};

/**
 * Middleware: Check if authenticated user has one of the allowed roles
 * ADMIN role is always granted access to PROFESSIONAL-level capabilities.
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userRole = req.user.role;

    // ADMIN has umbrella access to PROFESSIONAL routes
    const isPermitted =
      allowedRoles.includes(userRole) ||
      (userRole === 'ADMIN' && allowedRoles.includes('PROFESSIONAL'));

    if (!isPermitted) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: insufficient permissions.',
      });
    }

    next();
  };
};

// Aliases for compatibility
export const protect = authenticateUser;
