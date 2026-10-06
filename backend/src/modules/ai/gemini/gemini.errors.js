/**
 * Dedicated error classes for Gemini AI operations
 * Ensures credentials, internal endpoint queries, and stack traces are never leaked.
 */

// Helper to sanitize sensitive strings (API keys, query parameters, authorization headers)
export const sanitizeErrorMessage = (message = '', sensitiveKey = '') => {
  if (typeof message !== 'string') {
    return 'An unexpected error occurred in Gemini AI service';
  }

  let sanitized = message;

  // Redact specific key if known
  if (sensitiveKey && sensitiveKey.length > 5) {
    sanitized = sanitized.replaceAll(sensitiveKey, '[REDACTED_API_KEY]');
  }

  // Redact Google API key patterns (AIzaSy...)
  sanitized = sanitized.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]');

  // Redact query parameter patterns (key=...)
  sanitized = sanitized.replace(/key=([^&\s]+)/gi, 'key=[REDACTED_API_KEY]');

  return sanitized;
};

/**
 * Base Gemini error class
 */
export class GeminiError extends Error {
  constructor(message, { statusCode = 500, code = 'GEMINI_ERROR', originalError = null } = {}) {
    const sanitized = sanitizeErrorMessage(message);
    super(sanitized);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    if (originalError && process.env.NODE_ENV !== 'production') {
      this.originalStatus = originalError.status || originalError.code;
    }
  }
}

/**
 * Thrown when Gemini API key or required model configurations are missing or invalid
 */
export class GeminiConfigError extends GeminiError {
  constructor(message = 'Gemini AI service is not properly configured. Missing API credentials.') {
    super(message, {
      statusCode: 500,
      code: 'GEMINI_CONFIG_ERROR',
    });
  }
}

/**
 * Thrown when upstream Gemini API request fails (network error, rate limiting, bad request, 5xx)
 */
export class GeminiApiError extends GeminiError {
  constructor(message = 'Gemini AI service encountered an upstream provider error.', { statusCode = 502, originalError = null } = {}) {
    super(message, {
      statusCode,
      code: 'GEMINI_API_ERROR',
      originalError,
    });
  }
}

/**
 * Thrown when prompt or generated response triggers Google safety blocks
 */
export class GeminiSafetyError extends GeminiError {
  constructor(message = 'The conversation content was flagged by AI safety filters.') {
    super(message, {
      statusCode: 422,
      code: 'GEMINI_SAFETY_ERROR',
    });
  }
}

/**
 * Utility to safely translate raw upstream SDK errors into controlled application errors
 */
export const wrapGeminiError = (error, sensitiveKey = '') => {
  if (error instanceof GeminiError) {
    return error;
  }

  const rawMessage = error?.message || 'Unknown error occurred during Gemini AI operation';
  const sanitizedMessage = sanitizeErrorMessage(rawMessage, sensitiveKey);

  // Check for safety blocks
  if (
    sanitizedMessage.toLowerCase().includes('safety') ||
    sanitizedMessage.toLowerCase().includes('blocked') ||
    error?.status === 422
  ) {
    return new GeminiSafetyError(sanitizedMessage);
  }

  // Check for invalid API key or auth failures
  if (
    sanitizedMessage.toLowerCase().includes('api key not valid') ||
    sanitizedMessage.toLowerCase().includes('unauthenticated') ||
    error?.status === 400 ||
    error?.status === 401 ||
    error?.status === 403
  ) {
    return new GeminiApiError(`Gemini authentication or authorization failed: ${sanitizedMessage}`, {
      statusCode: 502,
      originalError: error,
    });
  }

  // Check for quota / rate limits
  if (
    sanitizedMessage.toLowerCase().includes('quota') ||
    sanitizedMessage.toLowerCase().includes('rate limit') ||
    error?.status === 429
  ) {
    return new GeminiApiError('Gemini AI rate limit or quota exceeded. Please try again shortly.', {
      statusCode: 429,
      originalError: error,
    });
  }

  // Generic API or network failure
  return new GeminiApiError(`Gemini service error: ${sanitizedMessage}`, {
    statusCode: error?.status && error.status >= 400 && error.status < 600 ? error.status : 502,
    originalError: error,
  });
};
