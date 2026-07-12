import { z } from 'zod';

/**
 * Strong password policy shared by signup, reset and change endpoints:
 *  - at least 8 characters
 *  - one uppercase, one lowercase
 *  - one digit or special character
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[\d\W]/, 'Password must include a digit or special character');

export const registerSchema = z.object({
  email: z
    .string()
    .email()
    .max(255)
    .transform((v) => v.toLowerCase()),
  password: passwordSchema,
  firstName: z.string().min(1).max(80).trim(),
  lastName: z.string().min(1).max(80).trim(),
  phone: z.string().max(40).optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'currentPassword is required'),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(80).trim().optional(),
  lastName: z.string().min(1).max(80).trim().optional(),
  phone: z.string().max(40).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
