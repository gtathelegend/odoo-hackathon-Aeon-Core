import type { Response } from 'express';
import { assistantService } from '../services/assistant.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../utils/response';
import { AuthenticationError } from '../utils/errors';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import type {
  ChatMessageInput,
  NlSearchInput,
  SummaryInput,
  FeedbackInput,
  PromptUpsertInput,
} from '../validators/assistant';

export const assistantController = {
  /** POST /assistant/chat — Send a message and get AI response. */
  chat: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    const input = req.body as ChatMessageInput;
    const result = await assistantService.chat({ user: req.user, input });
    sendSuccess(res, result, 'Message processed');
  }),

  /** POST /assistant/chat/stream — Stream AI response via SSE. */
  chatStream: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    const input = req.body as ChatMessageInput;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      for await (const chunk of assistantService.chatStream({ user: req.user, input })) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Stream interrupted';
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      res.write('data: [DONE]\n\n');
    }
    res.end();
  }),

  /** POST /assistant/search — Natural language search. */
  search: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    const input = req.body as NlSearchInput;
    const result = await assistantService.naturalLanguageSearch(req.user, input);
    sendSuccess(res, result);
  }),

  /** POST /assistant/summary — Generate executive summary / report. */
  summary: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    const input = req.body as SummaryInput;
    const result = await assistantService.generateSummary(req.user, input);
    sendSuccess(res, result);
  }),

  /** GET /assistant/recommendations/:type — Get AI recommendations. */
  recommendations: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    const type = req.params.type as 'asset' | 'maintenance';
    const result = await assistantService.getRecommendations(req.user, type);
    sendSuccess(res, result);
  }),

  /** GET /assistant/conversations — List user conversations. */
  listConversations: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    const { page, limit, status, search } = req.query as Record<string, string | undefined>;
    const result = await assistantService.listConversations(req.user.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      search,
    });
    sendSuccess(res, result);
  }),

  /** GET /assistant/conversations/:id — Get a single conversation with messages. */
  getConversation: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    const result = await assistantService.getConversation(req.params.id!, req.user.id);
    sendSuccess(res, result);
  }),

  /** PATCH /assistant/conversations/:id — Update title or status. */
  updateConversation: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    await assistantService.updateConversation(req.params.id!, req.user.id, req.body);
    sendSuccess(res, null, 'Conversation updated');
  }),

  /** DELETE /assistant/conversations/:id — Soft-delete a conversation. */
  deleteConversation: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    await assistantService.deleteConversation(req.params.id!, req.user.id);
    sendSuccess(res, null, 'Conversation deleted');
  }),

  /** POST /assistant/feedback — Submit feedback on AI response. */
  feedback: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    const input = req.body as FeedbackInput;
    const result = await assistantService.submitFeedback(req.user.id, input);
    sendCreated(res, result, 'Feedback submitted');
  }),

  /** GET /assistant/feedback/stats — Get feedback statistics (admin). */
  feedbackStats: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    const result = await assistantService.getFeedbackStats();
    sendSuccess(res, result);
  }),

  /** GET /assistant/prompts — List managed prompts (admin). */
  listPrompts: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    const result = await assistantService.listPrompts();
    sendSuccess(res, result);
  }),

  /** PUT /assistant/prompts — Create or update a prompt (admin). */
  upsertPrompt: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    const input = req.body as PromptUpsertInput;
    const result = await assistantService.upsertPrompt(input, req.user.id);
    sendSuccess(res, result, 'Prompt saved');
  }),

  /** GET /assistant/settings — Get AI configuration (admin). */
  getSettings: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new AuthenticationError();
    const result = assistantService.getSettings();
    sendSuccess(res, result);
  }),

  /** GET /assistant/health — Check AI service health. */
  health: asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const result = assistantService.healthCheck();
    sendSuccess(res, result);
  }),
};
