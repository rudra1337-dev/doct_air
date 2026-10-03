import jwt from 'jsonwebtoken';
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  NODE_ENV,
  COOKIE_NAME,
  COOKIE_MAX_AGE_MS,
} from '../config/env.js';

/**
 * Generate a signed JWT with minimal claims (userId, role)
 */
export const generateToken = (user) => {
  const payload = {
    userId: user.id || user._id.toString(),
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Verify a JWT and return its decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Calculate cookie options based on environment
 */
export const getCookieOptions = () => {
  const isProduction = NODE_ENV === 'production';
  return {
    httpOnly: true, // Prevents access via client JavaScript (XSS mitigation)
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax', // Protects against CSRF while allowing local dev navigation
    maxAge: COOKIE_MAX_AGE_MS, // Expiration matching session token
    path: '/',
  };
};

/**
 * Attach the JWT as an httpOnly cookie to the HTTP response
 */
export const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
};

/**
 * Clear the auth cookie on logout
 */
export const clearAuthCookie = (res) => {
  const options = getCookieOptions();
  delete options.maxAge;
  res.clearCookie(COOKIE_NAME, options);
};
