import { HTTP_STATUS } from '../constants/http';

/**
 * Root operational error. All application errors extend BaseError so the
 * global error handler can distinguish expected failures from crashes.
 */
export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code = 'INTERNAL_ERROR',
    isOperational = true,
    details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** Backwards-compatible alias for consumers that reference AppError. */
export const AppError = BaseError;

export class ValidationError extends BaseError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR', true, details);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message = 'Authentication required', details?: unknown) {
    super(message, HTTP_STATUS.UNAUTHORIZED, 'AUTHENTICATION_ERROR', true, details);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message = 'You do not have permission to perform this action', details?: unknown) {
    super(message, HTTP_STATUS.FORBIDDEN, 'AUTHORIZATION_ERROR', true, details);
  }
}

export class NotFoundError extends BaseError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(message, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND', true, details);
  }
}

export class ConflictError extends BaseError {
  constructor(message = 'Resource conflict', details?: unknown) {
    super(message, HTTP_STATUS.CONFLICT, 'CONFLICT', true, details);
  }
}

export class DatabaseError extends BaseError {
  constructor(message = 'A database error occurred', details?: unknown) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR', true, details);
  }
}

export class InternalServerError extends BaseError {
  constructor(message = 'Internal server error', details?: unknown) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR', false, details);
  }
}

export class NotImplementedError extends BaseError {
  constructor(message = 'Not implemented', details?: unknown) {
    super(message, HTTP_STATUS.NOT_IMPLEMENTED, 'NOT_IMPLEMENTED', true, details);
  }
}

export class TooManyRequestsError extends BaseError {
  constructor(message = 'Too many requests', details?: unknown) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, 'RATE_LIMITED', true, details);
  }
}
