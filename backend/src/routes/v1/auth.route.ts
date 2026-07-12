import { Router } from 'express';
import { authController } from '../../controllers/auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { createRateLimiter } from '../../middleware/rateLimiter.middleware';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../../validators/auth';

const router = Router();

/**
 * Auth endpoints exposed under /api/v1/auth.
 *
 *  POST /register          — self-signup (public)
 *  POST /login             — password login (public, rate-limited)
 *  POST /refresh           — access-token rotation (public, cookie or body)
 *  POST /logout            — revoke tokens
 *  GET  /me                — current profile
 *  PATCH /me               — update profile
 *  POST /change-password   — while authenticated
 *  POST /forgot-password   — request reset token (public, rate-limited)
 *  POST /reset-password    — complete reset (public)
 */

const strictLoginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
const forgotLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10 });

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', strictLoginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema.partial()), authController.refresh);
router.post('/logout', authController.logout);

router.get('/me', authMiddleware, authController.me);
router.patch('/me', authMiddleware, validate(updateProfileSchema), authController.updateProfile);

router.post(
  '/change-password',
  authMiddleware,
  validate(changePasswordSchema),
  authController.changePassword,
);

router.post(
  '/forgot-password',
  forgotLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

export default router;
