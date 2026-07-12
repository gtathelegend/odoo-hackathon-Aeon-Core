import { apiClient, API_BASE_URL } from '../lib/api-client';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  status: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  _count?: { messages: number };
}

export interface ConversationListItem {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  messages: ChatMessage[];
  _count: { messages: number };
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  content: string;
  tokens?: number;
}

export interface SearchResult {
  query: string;
  interpretation: string;
  table: string;
  results: unknown[];
  total: number;
}

export interface SummaryResponse {
  type: string;
  content: string;
  generatedAt: string;
  tokens?: number;
}

export interface RecommendationResponse {
  type: string;
  recommendations: string;
  generatedAt: string;
}

export interface AiHealth {
  configured: boolean;
  model: string;
  provider: string;
}

export interface ChatInput {
  message: string;
  conversationId?: string;
  context?: {
    assetIds?: string[];
    departmentId?: string;
    intent?: 'general' | 'search' | 'recommendation' | 'maintenance' | 'summary' | 'report' | 'insights';
  };
}

export const assistantService = {
  /** Send a chat message (non-streaming). */
  async chat(input: ChatInput): Promise<ChatResponse> {
    return apiClient.post<ChatResponse>('/assistant/chat', input);
  },

  /** Stream a chat response via SSE. Returns an EventSource-like reader. */
  chatStream(
    input: ChatInput,
    onChunk: (content: string) => void,
    onDone: (conversationId?: string) => void,
    onError: (error: string) => void,
  ): AbortController {
    const controller = new AbortController();

    (async () => {
      try {
        // Get the token from auth store
        const storeModule = await import('../store/auth.store');
        const token = storeModule.useAuthStore.getState().accessToken;

        const res = await fetch(`${API_BASE_URL}/assistant/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify(input),
          signal: controller.signal,
        });

        if (!res.ok) {
          onError(`Request failed: ${res.status}`);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          onError('No response body');
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                onDone();
                return;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  // Check for conversation ID marker
                  const doneMatch = parsed.content.match(/\[DONE:(.+?)\]/);
                  if (doneMatch) {
                    onDone(doneMatch[1]);
                  } else {
                    onChunk(parsed.content);
                  }
                }
                if (parsed.error) {
                  onError(parsed.error);
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
        onDone();
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          onError((error as Error).message || 'Stream failed');
        }
      }
    })();

    return controller;
  },

  /** Natural language search. */
  async search(query: string, type?: string, limit?: number): Promise<SearchResult> {
    return apiClient.post<SearchResult>('/assistant/search', { query, type, limit });
  },

  /** Generate a summary/report. */
  async generateSummary(
    type: 'executive' | 'weekly' | 'insights',
    departmentId?: string,
  ): Promise<SummaryResponse> {
    return apiClient.post<SummaryResponse>('/assistant/summary', { type, departmentId });
  },

  /** Get AI recommendations. */
  async getRecommendations(type: 'asset' | 'maintenance'): Promise<RecommendationResponse> {
    return apiClient.get<RecommendationResponse>(`/assistant/recommendations/${type}`);
  },

  /** List conversations. */
  async listConversations(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ items: ConversationListItem[]; total: number; page: number; totalPages: number }> {
    return apiClient.get('/assistant/conversations', { query: params as Record<string, string> });
  },

  /** Get a single conversation. */
  async getConversation(id: string): Promise<Conversation> {
    return apiClient.get<Conversation>(`/assistant/conversations/${id}`);
  },

  /** Delete a conversation. */
  async deleteConversation(id: string): Promise<void> {
    await apiClient.delete(`/assistant/conversations/${id}`);
  },

  /** Update a conversation (title, status). */
  async updateConversation(id: string, data: { title?: string; status?: string }): Promise<void> {
    await apiClient.patch(`/assistant/conversations/${id}`, data);
  },

  /** Submit feedback. */
  async submitFeedback(data: {
    messageId?: string;
    conversationId?: string;
    rating?: number;
    comment?: string;
  }): Promise<void> {
    await apiClient.post('/assistant/feedback', data);
  },

  /** Check AI health. */
  async health(): Promise<AiHealth> {
    return apiClient.get<AiHealth>('/assistant/health');
  },

  /** Get AI settings (admin). */
  async getSettings(): Promise<{ model: string; maxTokens: number; temperature: number; configured: boolean }> {
    return apiClient.get('/assistant/settings');
  },
};
