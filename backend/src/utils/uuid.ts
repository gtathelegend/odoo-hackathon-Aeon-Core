import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

/** Generate a v4 UUID. */
export function generateUuid(): string {
  return uuidv4();
}

/** Validate that the given value is a well-formed UUID. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuidValidate(value);
}
