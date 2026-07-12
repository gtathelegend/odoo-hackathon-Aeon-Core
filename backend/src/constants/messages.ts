/** Standard user-facing response messages. */
export const MESSAGES = {
  SUCCESS: 'Success',
  CREATED: 'Resource created',
  UPDATED: 'Resource updated',
  DELETED: 'Resource deleted',
  FETCHED: 'Resource fetched',

  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Bad request',
  VALIDATION_FAILED: 'Validation failed',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'You do not have permission to perform this action',
  CONFLICT: 'Resource conflict',
  TOO_MANY_REQUESTS: 'Too many requests, please try again later',

  INTERNAL_ERROR: 'Internal server error',
  NOT_IMPLEMENTED: 'Not implemented',
  SERVICE_UNAVAILABLE: 'Service unavailable',
} as const;

export type Message = (typeof MESSAGES)[keyof typeof MESSAGES];
