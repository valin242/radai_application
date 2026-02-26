import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { createLogger } from '../lib/logger';

const logger = createLogger({ component: 'error-sanitizer' });

/**
 * List of sensitive field names that should be removed from error responses
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'session',
  'credentials',
  'private_key',
  'privateKey',
  'access_token',
  'refresh_token',
];

/**
 * Recursively sanitize an object by removing sensitive fields
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Check if the key is sensitive
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_FIELDS.some((field) =>
        lowerKey.includes(field.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (key.toLowerCase() === 'value' && typeof value === 'string') {
        // Special case: if the key is 'value', check if it might be sensitive
        // This handles cases like { field: 'password', value: 'secret' }
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }

    return sanitized;
  }

  return obj;
}

/**
 * Sanitize error message to remove sensitive information
 */
function sanitizeErrorMessage(message: string): string {
  let sanitized = message;

  // Remove potential file paths
  sanitized = sanitized.replace(/([A-Z]:\\|\/)[^\s]+/g, '[PATH]');

  // Remove potential email addresses
  sanitized = sanitized.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');

  // Remove potential tokens (long alphanumeric strings)
  sanitized = sanitized.replace(/\b[A-Za-z0-9]{32,}\b/g, '[TOKEN]');

  // Remove potential API keys
  sanitized = sanitized.replace(/\b(sk|pk)_[A-Za-z0-9_]{20,}\b/g, '[API_KEY]');

  return sanitized;
}

/**
 * Create a user-friendly error message based on error type
 */
function getUserFriendlyMessage(error: FastifyError): string {
  // Map common error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    FST_ERR_VALIDATION: 'Invalid request data',
    FST_ERR_NOT_FOUND: 'Resource not found',
    FST_ERR_BAD_REQUEST: 'Bad request',
    FST_ERR_UNAUTHORIZED: 'Authentication required',
    FST_ERR_FORBIDDEN: 'Access denied',
    FST_ERR_TOO_MANY_REQUESTS: 'Too many requests, please try again later',
  };

  if (error.code && errorMessages[error.code]) {
    return errorMessages[error.code];
  }

  // For other errors, return a generic message
  if (error.statusCode && error.statusCode >= 500) {
    return 'An internal server error occurred';
  }

  if (error.statusCode && error.statusCode >= 400) {
    return 'An error occurred processing your request';
  }

  return 'An unexpected error occurred';
}

/**
 * Error handler middleware that sanitizes error responses
 * Removes sensitive information like passwords, tokens, and internal details
 */
export function errorSanitizerHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const requestLogger = logger.child({
    requestId: request.id,
    method: request.method,
    url: request.url,
  });

  // Log the full error with stack trace for debugging
  requestLogger.error('Request error occurred', error, {
    statusCode: error.statusCode,
    code: error.code,
  });

  // Determine status code
  const statusCode = error.statusCode || 500;

  // Create sanitized error response
  const sanitizedError: {
    error: {
      code: string;
      message: string;
      details?: unknown;
    };
  } = {
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: getUserFriendlyMessage(error),
    },
  };

  // In development, include more details (but still sanitized)
  if (process.env.NODE_ENV !== 'production') {
    sanitizedError.error.details = {
      originalMessage: sanitizeErrorMessage(error.message),
      ...(error.validation && {
        validation: sanitizeObject(error.validation),
      }),
    };
  }

  // Send sanitized error response
  void reply.status(statusCode).send(sanitizedError);
}
