import type { Request } from 'express';
import type { JwtPayload } from '../utils/jwt';

/**
 * Shared service and infrastructure interfaces. Concrete contracts are
 * expanded in later prompts.
 */

/** Express request augmented with the authenticated user context. */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/** Generic repository contract implemented by data-access layers. */
export interface BaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findMany(): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
