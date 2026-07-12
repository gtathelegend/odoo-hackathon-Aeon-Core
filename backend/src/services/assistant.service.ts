import OpenAI from 'openai';
import { grokConfig, isGrokConfigured } from '../config/grok';
import { assistantRepository } from '../repositories/assistant.repository';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { ValidationError, NotFoundError } from '../utils/errors';
import type { RequestUser } from '../interfaces/request-user.interface';
import type {
  ChatMessageInput,
  NlSearchInput,
  SummaryInput,
  FeedbackInput,
  AiSettingsInput,
  PromptUpsertInput,
} from '../validators/assistant';

// ─── OpenAI-compatible client for Grok ───────────────────────────────────────

let openai: OpenAI | null = null;

function getClient(): OpenAI {
  if (!isGrokConfigured()) {
    throw new ValidationError('AI assistant is not configured. Set GROK_API_KEY in environment.');
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: grokConfig.apiKey,
      baseURL: grokConfig.baseUrl,
    });
  }
  return openai;
}

// ─── Context builders ────────────────────────────────────────────────────────

async function buildAssetContext(assetIds?: string[]): Promise<string> {
  if (!assetIds?.length) return '';
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds }, deletedAt: null },
    select: {
      id: true,
      assetTag: true,
      name: true,
      status: true,
      condition: true,
      currentValue: true,
      location: { select: { name: true } },
      category: { select: { name: true } },
    },
    take: 10,
  });
  if (!assets.length) return '';
  const lines = assets.map(
    (a) =>
      `[${a.assetTag}] ${a.name} — Status: ${a.status}, Condition: ${a.condition}, Value: $${a.currentValue ?? 0}, Location: ${a.location?.name ?? 'N/A'}, Category: ${a.category?.name ?? 'N/A'}`,
  );
  return `\n\nRelevant assets:\n${lines.join('\n')}`;
}

async function buildDashboardContext(userId: string, departmentId?: string): Promise<string> {
  const scope: Record<string, unknown> = { deletedAt: null };
  if (departmentId) {
    const employees = await prisma.employee.findMany({
      where: { departmentId, deletedAt: null },
      select: { id: true },
    });
    scope.assignedToId = { in: employees.map((e) => e.id) };
  }

  const [totalAssets, activeAllocations, openMaintenance, pendingBookings] = await Promise.all([
    prisma.asset.count({ where: { deletedAt: null } }),
    prisma.allocation.count({ where: { status: 'ACTIVE', deletedAt: null } }),
    prisma.maintenanceRequest.count({
      where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] }, deletedAt: null },
    }),
    prisma.booking.count({
      where: { status: { in: ['PENDING', 'CONFIRMED'] }, deletedAt: null },
    }),
  ]);

  return `\n\nCurrent system overview:
- Total assets: ${totalAssets}
- Active allocations: ${activeAllocations}
- Open maintenance requests: ${openMaintenance}
- Pending/Confirmed bookings: ${pendingBookings}`;
}

async function buildMaintenanceContext(): Promise<string> {
  const recent = await prisma.maintenanceRequest.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      title: true,
      status: true,
      priority: true,
      createdAt: true,
      asset: { select: { assetTag: true, name: true } },
    },
  });
  if (!recent.length) return '';
  const lines = recent.map(
    (m) =>
      `• ${m.title} [${m.priority}/${m.status}] — Asset: ${m.asset?.assetTag ?? 'N/A'} (${m.createdAt.toISOString().slice(0, 10)})`,
  );
  return `\n\nRecent maintenance requests:\n${lines.join('\n')}`;
}

// ─── Core chat completion ────────────────────────────────────────────────────

interface ChatOptions {
  user: RequestUser;
  input: ChatMessageInput;
}

interface ChatResponse {
  conversationId: string;
  messageId: string;
  content: string;
  tokens?: number;
}

export const assistantService = {
  /**
   * Send a message to the AI assistant. Creates or continues a conversation.
   * Builds context from the system state and sends to Grok API.
   */
  async chat(options: ChatOptions): Promise<ChatResponse> {
    const { user, input } = options;
    const client = getClient();

    // Get or create conversation
    let conversationId = input.conversationId;
    if (!conversationId) {
      const conv = await assistantRepository.createConversation({
        userId: user.id,
        title: input.message.slice(0, 60),
        model: grokConfig.model,
      });
      conversationId = conv.id;
    } else {
      const existing = await assistantRepository.findConversation(conversationId, user.id);
      if (!existing) throw new NotFoundError('Conversation not found');
    }

    // Save user message
    await assistantRepository.addMessage({
      conversationId,
      role: 'user',
      content: input.message,
    });

    // Build contextual system prompt
    let contextBlock = '';
    if (input.context?.assetIds) {
      contextBlock += await buildAssetContext(input.context.assetIds);
    }
    if (input.context?.intent === 'insights' || input.context?.intent === 'summary') {
      contextBlock += await buildDashboardContext(user.id, input.context?.departmentId);
    }
    if (input.context?.intent === 'maintenance') {
      contextBlock += await buildMaintenanceContext();
    }

    // Load conversation history (last 20 messages for context window)
    const history = await assistantRepository.getMessages(conversationId, 20);
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: grokConfig.systemPrompt + contextBlock },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Call Grok API
    let completion: OpenAI.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: grokConfig.model,
        messages,
        max_tokens: grokConfig.maxTokens,
        temperature: grokConfig.temperature,
      });
    } catch (error) {
      logger.error('Grok API call failed', { error });
      throw new ValidationError('AI service is temporarily unavailable. Please try again later.');
    }

    const content = completion.choices[0]?.message?.content ?? 'I could not generate a response.';
    const tokens = completion.usage?.total_tokens;

    // Save assistant response
    const savedMessage = await assistantRepository.addMessage({
      conversationId,
      role: 'assistant',
      content,
      tokens,
    });

    return {
      conversationId,
      messageId: savedMessage.id,
      content,
      tokens,
    };
  },

  /**
   * Stream a chat response using Server-Sent Events.
   * Returns an async generator of content chunks.
   */
  async *chatStream(options: ChatOptions): AsyncGenerator<string, void, unknown> {
    const { user, input } = options;
    const client = getClient();

    let conversationId = input.conversationId;
    if (!conversationId) {
      const conv = await assistantRepository.createConversation({
        userId: user.id,
        title: input.message.slice(0, 60),
        model: grokConfig.model,
      });
      conversationId = conv.id;
    } else {
      const existing = await assistantRepository.findConversation(conversationId, user.id);
      if (!existing) throw new NotFoundError('Conversation not found');
    }

    await assistantRepository.addMessage({
      conversationId,
      role: 'user',
      content: input.message,
    });

    let contextBlock = '';
    if (input.context?.assetIds) {
      contextBlock += await buildAssetContext(input.context.assetIds);
    }
    if (input.context?.intent === 'insights' || input.context?.intent === 'summary') {
      contextBlock += await buildDashboardContext(user.id, input.context?.departmentId);
    }
    if (input.context?.intent === 'maintenance') {
      contextBlock += await buildMaintenanceContext();
    }

    const history = await assistantRepository.getMessages(conversationId, 20);
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: grokConfig.systemPrompt + contextBlock },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const stream = await client.chat.completions.create({
      model: grokConfig.model,
      messages,
      max_tokens: grokConfig.maxTokens,
      temperature: grokConfig.temperature,
      stream: true,
    });

    let fullContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        yield delta;
      }
    }

    // Persist completed response
    await assistantRepository.addMessage({
      conversationId,
      role: 'assistant',
      content: fullContent,
    });

    // Yield metadata at end
    yield `\n\n[DONE:${conversationId}]`;
  },

  /**
   * Natural language search. Translates user query into structured data lookups.
   */
  async naturalLanguageSearch(user: RequestUser, input: NlSearchInput) {
    const client = getClient();
    const limit = input.limit ?? 10;

    const searchPrompt = `You are a search query translator for an asset management system.
Convert this natural language query into a structured search. Return ONLY a valid JSON object with:
- "table": one of "assets", "maintenance", "bookings", "allocations"
- "filters": object with field names and values to search for
- "explanation": brief explanation of what you're searching for

User query: "${input.query}"
${input.type ? `Scope: search only in "${input.type}" table` : ''}`;

    let parsed: { table: string; filters: Record<string, string>; explanation: string };
    try {
      const completion = await client.chat.completions.create({
        model: grokConfig.model,
        messages: [{ role: 'user', content: searchPrompt }],
        max_tokens: 500,
        temperature: 0.1,
      });
      const raw = completion.choices[0]?.message?.content ?? '{}';
      // Extract JSON from potential markdown code block
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
      parsed = JSON.parse(jsonMatch[1]?.trim() ?? '{}');
    } catch (error) {
      logger.warn('NL search parsing failed, falling back to text search', { error });
      parsed = { table: input.type ?? 'assets', filters: { name: input.query }, explanation: input.query };
    }

    // Execute the actual search based on parsed intent
    let results: unknown[] = [];
    const table = parsed.table || input.type || 'assets';

    if (table === 'assets') {
      results = await prisma.asset.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: input.query, mode: 'insensitive' } },
            { assetTag: { contains: input.query, mode: 'insensitive' } },
            { serialNumber: { contains: input.query, mode: 'insensitive' } },
            { description: { contains: input.query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          assetTag: true,
          name: true,
          status: true,
          condition: true,
          currentValue: true,
          location: { select: { name: true } },
          category: { select: { name: true } },
        },
      });
    } else if (table === 'maintenance') {
      results = await prisma.maintenanceRequest.findMany({
        where: {
          deletedAt: null,
          OR: [
            { title: { contains: input.query, mode: 'insensitive' } },
            { description: { contains: input.query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          asset: { select: { assetTag: true, name: true } },
        },
      });
    } else if (table === 'bookings') {
      results = await prisma.booking.findMany({
        where: {
          deletedAt: null,
          OR: [
            { purpose: { contains: input.query, mode: 'insensitive' } },
            { notes: { contains: input.query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { startTime: 'desc' },
        select: {
          id: true,
          purpose: true,
          status: true,
          startTime: true,
          endTime: true,
          asset: { select: { assetTag: true, name: true } },
        },
      });
    } else if (table === 'allocations') {
      results = await prisma.allocation.findMany({
        where: {
          deletedAt: null,
          OR: [
            { notes: { contains: input.query, mode: 'insensitive' } },
            { purpose: { contains: input.query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { allocationDate: 'desc' },
        select: {
          id: true,
          status: true,
          purpose: true,
          allocationDate: true,
          asset: { select: { assetTag: true, name: true } },
          employee: { select: { user: { select: { firstName: true, lastName: true } } } },
        },
      });
    }

    return {
      query: input.query,
      interpretation: parsed.explanation,
      table,
      results,
      total: results.length,
    };
  },

  /**
   * Generate executive summary, weekly report, or dashboard insights.
   */
  async generateSummary(user: RequestUser, input: SummaryInput) {
    const client = getClient();
    const context = await buildDashboardContext(user.id, input.departmentId);
    const maintenanceCtx = await buildMaintenanceContext();

    const promptMap: Record<string, string> = {
      executive: `Generate a concise executive summary of the current asset management state. Include key metrics, notable trends, and actionable recommendations. Keep it under 300 words.`,
      weekly: `Generate a weekly report summary. Highlight changes in asset status, new maintenance requests, completed allocations, and upcoming items that need attention. Format with bullet points and sections.`,
      insights: `Analyze the current dashboard data and provide 3-5 actionable insights. For each insight, explain the observation, its impact, and a suggested action. Be specific and data-driven.`,
    };

    const systemContent = `${grokConfig.systemPrompt}${context}${maintenanceCtx}`;
    const userContent = promptMap[input.type] ?? promptMap.executive!;

    const completion = await client.chat.completions.create({
      model: grokConfig.model,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      max_tokens: grokConfig.maxTokens,
      temperature: 0.5,
    });

    return {
      type: input.type,
      content: completion.choices[0]?.message?.content ?? 'Unable to generate summary.',
      generatedAt: new Date().toISOString(),
      tokens: completion.usage?.total_tokens,
    };
  },

  /**
   * Get asset recommendations based on usage patterns and current state.
   */
  async getRecommendations(user: RequestUser, type: 'asset' | 'maintenance') {
    const client = getClient();

    let contextData = '';
    if (type === 'asset') {
      const underutilized = await prisma.asset.findMany({
        where: { status: 'AVAILABLE', deletedAt: null },
        take: 10,
        orderBy: { updatedAt: 'asc' },
        select: { assetTag: true, name: true, category: { select: { name: true } }, updatedAt: true },
      });
      contextData = `\nUnderutilized assets (available, not recently updated):\n${underutilized
        .map((a) => `- ${a.assetTag}: ${a.name} (${a.category?.name ?? 'N/A'}) — last updated ${a.updatedAt.toISOString().slice(0, 10)}`)
        .join('\n')}`;
    } else {
      const overdue = await prisma.maintenanceRequest.findMany({
        where: { status: { in: ['PENDING', 'ASSIGNED'] }, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        take: 10,
        select: {
          title: true,
          priority: true,
          createdAt: true,
          asset: { select: { assetTag: true, name: true } },
        },
      });
      contextData = `\nPending maintenance requests (oldest first):\n${overdue
        .map((m) => `- ${m.title} [${m.priority}] for ${m.asset?.assetTag ?? 'N/A'} — opened ${m.createdAt.toISOString().slice(0, 10)}`)
        .join('\n')}`;
    }

    const prompt =
      type === 'asset'
        ? 'Based on the asset data, provide 3-5 recommendations for optimizing asset utilization. Consider reallocation, disposal, or maintenance needs.'
        : 'Based on the maintenance data, provide 3-5 prioritized recommendations. Consider urgency, asset value, and potential operational impact.';

    const completion = await client.chat.completions.create({
      model: grokConfig.model,
      messages: [
        { role: 'system', content: `${grokConfig.systemPrompt}${contextData}` },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.5,
    });

    return {
      type,
      recommendations: completion.choices[0]?.message?.content ?? 'Unable to generate recommendations.',
      generatedAt: new Date().toISOString(),
    };
  },

  // ─── Conversation management ─────────────────────────────────────────────

  async listConversations(userId: string, filters: { page?: number; limit?: number; status?: string; search?: string }) {
    return assistantRepository.listConversations({ userId, ...filters });
  },

  async getConversation(conversationId: string, userId: string) {
    const conv = await assistantRepository.findConversation(conversationId, userId);
    if (!conv) throw new NotFoundError('Conversation not found');
    return conv;
  },

  async deleteConversation(conversationId: string, userId: string) {
    const result = await assistantRepository.deleteConversation(conversationId, userId);
    if (result.count === 0) throw new NotFoundError('Conversation not found');
  },

  async updateConversation(conversationId: string, userId: string, data: { title?: string; status?: string }) {
    const result = await assistantRepository.updateConversation(conversationId, userId, data);
    if (result.count === 0) throw new NotFoundError('Conversation not found');
  },

  // ─── Feedback ──────────────────────────────────────────────────────────────

  async submitFeedback(userId: string, input: FeedbackInput) {
    return assistantRepository.addFeedback({ ...input, userId });
  },

  async getFeedbackStats() {
    return assistantRepository.getFeedbackStats();
  },

  // ─── Prompt management (admin) ─────────────────────────────────────────────

  async listPrompts() {
    return assistantRepository.listPrompts();
  },

  async upsertPrompt(input: PromptUpsertInput, userId: string) {
    return assistantRepository.upsertPrompt({ ...input, updatedBy: userId });
  },

  // ─── AI Settings ───────────────────────────────────────────────────────────

  getSettings() {
    return {
      model: grokConfig.model,
      maxTokens: grokConfig.maxTokens,
      temperature: grokConfig.temperature,
      configured: isGrokConfigured(),
    };
  },

  /** Check if AI is configured and available. */
  healthCheck() {
    return {
      configured: isGrokConfigured(),
      model: grokConfig.model,
      provider: 'xAI (Grok)',
    };
  },
};
