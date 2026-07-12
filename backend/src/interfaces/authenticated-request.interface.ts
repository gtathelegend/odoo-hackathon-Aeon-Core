import type { Request } from 'express';
import type { RequestUser } from './request-user.interface';

/** Express request augmented with authenticated user + request id metadata. */
export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
  requestId?: string;
}
