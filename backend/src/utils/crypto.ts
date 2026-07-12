import crypto from 'crypto';

/** SHA-256 hex digest of a string. Useful for opaque token lookups. */
export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Constant-time comparison of two strings. Safe against timing attacks. */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

/** Generate cryptographically strong random bytes as a hex string. */
export function generateRandomHex(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Generate a URL-safe random token. */
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}
