import { Router } from 'express';
import { assistantController } from '../../controllers';
import { authMiddleware } from '../../middleware';
import { validate } from '../../middleware';
import { createRateLimiter } from '../../middleware';
import {
  chatMessageSchema,
  nlSearchSchema,
  summarySchema,
  feedbackSchema,
  promptUpsertSchema,
  conversationListSchema,
} from '../../validators/assistant';

const router = Router();

// Stricter rate limit for AI endpoints (20 req/min)
const aiRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  message: 'AI rate limit exceeded. Please wait before sending more requests.',
});

// ─── Health (no auth required) ────────────────────────────────────────────────
router.get('/health', assistantController.health);

// All other routes require authentication
router.use(authMiddleware);
router.use(aiRateLimiter);

// ─── Chat ─────────────────────────────────────────────────────────────────────
router.post('/chat', validate({ body: chatMessageSchema }), assistantController.chat);
router.post('/chat/stream', validate({ body: chatMessageSchema }), assistantController.chatStream);

// ─── Search & Intelligence ────────────────────────────────────────────────────
router.post('/search', validate({ body: nlSearchSchema }), assistantController.search);
router.post('/summary', validate({ body: summarySchema }), assistantController.summary);
router.get('/recommendations/:type', assistantController.recommendations);

// ─── Conversations ────────────────────────────────────────────────────────────
router.get('/conversations', assistantController.listConversations);
router.get('/conversations/:id', assistantController.getConversation);
router.patch('/conversations/:id', assistantController.updateConversation);
router.delete('/conversations/:id', assistantController.deleteConversation);

// ─── Feedback ─────────────────────────────────────────────────────────────────
router.post('/feedback', validate({ body: feedbackSchema }), assistantController.feedback);
router.get('/feedback/stats', assistantController.feedbackStats);

// ─── Prompts (admin) ──────────────────────────────────────────────────────────
router.get('/prompts', assistantController.listPrompts);
router.put('/prompts', validate({ body: promptUpsertSchema }), assistantController.upsertPrompt);

// ─── Settings (admin) ─────────────────────────────────────────────────────────
router.get('/settings', assistantController.getSettings);

export default router;
