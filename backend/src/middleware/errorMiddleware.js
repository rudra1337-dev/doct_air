import { NODE_ENV } from '../config/env.js';

// Central error handler — must be the LAST middleware registered
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected server error occurred',
    ...(NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
