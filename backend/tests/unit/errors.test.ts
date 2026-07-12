import { describe, expect, it } from 'vitest';
import {
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  InternalServerError,
  NotImplementedError,
} from '../../src/utils/errors';

describe('application errors', () => {
  it('BaseError defaults to 500 + INTERNAL_ERROR', () => {
    const error = new BaseError('boom');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.isOperational).toBe(true);
  });

  it('ValidationError maps to 400', () => {
    const error = new ValidationError('bad');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('AuthenticationError maps to 401', () => {
    expect(new AuthenticationError().statusCode).toBe(401);
  });

  it('AuthorizationError maps to 403', () => {
    expect(new AuthorizationError().statusCode).toBe(403);
  });

  it('NotFoundError maps to 404', () => {
    expect(new NotFoundError().statusCode).toBe(404);
  });

  it('ConflictError maps to 409', () => {
    expect(new ConflictError().statusCode).toBe(409);
  });

  it('DatabaseError maps to 500', () => {
    expect(new DatabaseError().statusCode).toBe(500);
  });

  it('InternalServerError is non-operational', () => {
    expect(new InternalServerError().isOperational).toBe(false);
  });

  it('NotImplementedError maps to 501', () => {
    expect(new NotImplementedError().statusCode).toBe(501);
  });
});
