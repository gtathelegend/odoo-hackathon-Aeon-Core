import { z } from 'zod';

/** Send a chat message to the AI assistant. */
export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(4000, 'Message too long'),
  conversationId: z.string().uuid().optional(),
  context: z
    .object({
      assetIds: z.array(z.string().uuid()).optional(),
      departmentId: z.string().uuid().optional(),
      intent: z
        .enum([
          'general',
          'search',
          'recommendation',
          'maintenance',
          'summary',
          'report',
          'insights',
        ])
        .optional(),
    })
    .optional(),
});

/** Natural language search request. */
export const nlSearchSchema = z.object({
  query: z.string().min(1).max(500),
  type: z.enum(['assets', 'maintenance', 'bookings', 'allocations', 'all']).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

/** Executive summary / weekly report request. */
export const summarySchema = z.object({
  type: z.enum(['executive', 'weekly', 'insights']),
  departmentId: z.string().uuid().optional(),
  dateRange: z
    .object({
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .optional(),
});

/** Conversation list query. */
export const conversationListSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  search: z.string().optional(),
});

/** Feedback submission. */
export const feedbackSchema = z.object({
  messageId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
});

/** AI settings update (admin only). */
export const aiSettingsSchema = z.object({
  model: z.string().optional(),
  maxTokens: z.coerce.number().int().positive().max(8192).optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
  systemPrompt: z.string().max(4000).optional(),
});

/** Prompt management. */
export const promptUpsertSchema = z.object({
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  template: z.string().min(1).max(8000),
  description: z.string().max(500).optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type NlSearchInput = z.infer<typeof nlSearchSchema>;
export type SummaryInput = z.infer<typeof summarySchema>;
export type ConversationListInput = z.infer<typeof conversationListSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type AiSettingsInput = z.infer<typeof aiSettingsSchema>;
export type PromptUpsertInput = z.infer<typeof promptUpsertSchema>;
