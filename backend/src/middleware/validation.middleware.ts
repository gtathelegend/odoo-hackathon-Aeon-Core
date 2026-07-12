import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validation middleware factory. Validates the given request segment against
 * a zod schema and forwards a ValidationError on failure. On success, the
 * parsed (and type-coerced) value is written back onto the request.
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(new ValidationError('Validation failed', result.error.flatten()));
      return;
    }
    // Persist the parsed/coerced values so downstream handlers use validated data.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[target] = result.data;
    next();
  };
}
