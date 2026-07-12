import { prisma } from '../config/database';
import type { Prisma } from '@prisma/client';

export interface ConversationFilters {
  userId: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const assistantRepository = {
  // ─── Conversations ──────────────────────────────────────────────────────

  async createConversation(data: {
    userId: string;
    title?: string;
    model?: string;
  }) {
    return prisma.assistantConversation.create({
      data: {
        userId: data.userId,
        title: data.title || 'New conversation',
        model: data.model,
        status: 'ACTIVE',
      },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
    });
  },

  async findConversation(id: string, userId: string) {
    return prisma.assistantConversation.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
  },

  async listConversations(filters: ConversationFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AssistantConversationWhereInput = {
      userId: filters.userId,
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? { title: { contains: filters.search, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.assistantConversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { messages: true } },
        },
      }),
      prisma.assistantConversation.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async updateConversation(id: string, userId: string, data: { title?: string; status?: string }) {
    return prisma.assistantConversation.updateMany({
      where: { id, userId, deletedAt: null },
      data: { ...data, updatedAt: new Date() },
    });
  },

  async deleteConversation(id: string, userId: string) {
    return prisma.assistantConversation.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
  },

  // ─── Messages ───────────────────────────────────────────────────────────

  async addMessage(data: {
    conversationId: string;
    role: string;
    content: string;
    tokens?: number;
  }) {
    const message = await prisma.assistantMessage.create({ data });
    // Touch conversation updatedAt
    await prisma.assistantConversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    });
    return message;
  },

  async getMessages(conversationId: string, limit = 100) {
    return prisma.assistantMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  },

  // ─── Prompts ────────────────────────────────────────────────────────────

  async getPromptByKey(key: string) {
    return prisma.assistantPrompt.findUnique({ where: { key } });
  },

  async listPrompts() {
    return prisma.assistantPrompt.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { key: 'asc' },
    });
  },

  async upsertPrompt(data: {
    key: string;
    name: string;
    template: string;
    description?: string;
    updatedBy?: string;
  }) {
    return prisma.assistantPrompt.upsert({
      where: { key: data.key },
      create: data,
      update: {
        name: data.name,
        template: data.template,
        description: data.description,
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      },
    });
  },

  // ─── Feedback ───────────────────────────────────────────────────────────

  async addFeedback(data: {
    conversationId?: string;
    messageId?: string;
    userId?: string;
    rating?: number;
    comment?: string;
  }) {
    return prisma.assistantFeedback.create({ data });
  },

  async getFeedbackStats() {
    const [total, avgRating] = await Promise.all([
      prisma.assistantFeedback.count(),
      prisma.assistantFeedback.aggregate({ _avg: { rating: true } }),
    ]);
    return { total, averageRating: avgRating._avg.rating ?? 0 };
  },
};
