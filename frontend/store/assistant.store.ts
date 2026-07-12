import { create } from 'zustand';
import {
  assistantService,
  type ChatMessage,
  type ConversationListItem,
  type ChatInput,
} from '../services/assistant.service';

export interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  isStreaming?: boolean;
}

interface AssistantState {
  // Sidebar state
  isOpen: boolean;
  isFloating: boolean;

  // Conversations
  conversations: ConversationListItem[];
  currentConversationId: string | null;
  messages: LocalMessage[];

  // UI state
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;

  // Stream controller
  streamController: AbortController | null;

  // Actions
  toggle: () => void;
  open: () => void;
  close: () => void;
  setFloating: (floating: boolean) => void;

  sendMessage: (message: string, context?: ChatInput['context']) => Promise<void>;
  sendMessageStream: (message: string, context?: ChatInput['context']) => void;
  stopStreaming: () => void;

  loadConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  newConversation: () => void;
  deleteConversation: (id: string) => Promise<void>;

  clearError: () => void;
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  isOpen: false,
  isFloating: true,
  conversations: [],
  currentConversationId: null,
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  streamController: null,

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setFloating: (floating) => set({ isFloating: floating }),

  sendMessage: async (message, context) => {
    const state = get();
    if (state.isLoading || state.isStreaming) return;

    const userMsg: LocalMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, userMsg],
      isLoading: true,
      error: null,
    }));

    try {
      const result = await assistantService.chat({
        message,
        conversationId: state.currentConversationId ?? undefined,
        context,
      });

      const assistantMsg: LocalMessage = {
        id: result.messageId,
        role: 'assistant',
        content: result.content,
        createdAt: new Date().toISOString(),
      };

      set((s) => ({
        messages: [...s.messages, assistantMsg],
        currentConversationId: result.conversationId,
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error).message || 'Failed to get response',
      });
    }
  },

  sendMessageStream: (message, context) => {
    const state = get();
    if (state.isLoading || state.isStreaming) return;

    const userMsg: LocalMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };

    const assistantMsg: LocalMessage = {
      id: `stream-${Date.now()}`,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };

    set((s) => ({
      messages: [...s.messages, userMsg, assistantMsg],
      isStreaming: true,
      error: null,
    }));

    const controller = assistantService.chatStream(
      {
        message,
        conversationId: state.currentConversationId ?? undefined,
        context,
      },
      // onChunk
      (content) => {
        set((s) => {
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === 'assistant' && last.isStreaming) {
            msgs[msgs.length - 1] = { ...last, content: last.content + content };
          }
          return { messages: msgs };
        });
      },
      // onDone
      (conversationId) => {
        set((s) => {
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.isStreaming) {
            msgs[msgs.length - 1] = { ...last, isStreaming: false };
          }
          return {
            messages: msgs,
            isStreaming: false,
            streamController: null,
            currentConversationId: conversationId ?? s.currentConversationId,
          };
        });
      },
      // onError
      (error) => {
        set((s) => {
          const msgs = s.messages.filter((m) => !m.isStreaming || m.content.length > 0);
          return { messages: msgs, isStreaming: false, error, streamController: null };
        });
      },
    );

    set({ streamController: controller });
  },

  stopStreaming: () => {
    const { streamController } = get();
    if (streamController) {
      streamController.abort();
      set((s) => {
        const msgs = [...s.messages];
        const last = msgs[msgs.length - 1];
        if (last && last.isStreaming) {
          msgs[msgs.length - 1] = { ...last, isStreaming: false };
        }
        return { messages: msgs, isStreaming: false, streamController: null };
      });
    }
  },

  loadConversations: async () => {
    try {
      const result = await assistantService.listConversations({ limit: 20 });
      set({ conversations: result.items });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  loadConversation: async (id) => {
    set({ isLoading: true });
    try {
      const conv = await assistantService.getConversation(id);
      const messages: LocalMessage[] = conv.messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        createdAt: m.createdAt,
      }));
      set({ currentConversationId: id, messages, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: (error as Error).message });
    }
  },

  newConversation: () => {
    set({ currentConversationId: null, messages: [], error: null });
  },

  deleteConversation: async (id) => {
    try {
      await assistantService.deleteConversation(id);
      set((s) => ({
        conversations: s.conversations.filter((c) => c.id !== id),
        ...(s.currentConversationId === id
          ? { currentConversationId: null, messages: [] }
          : {}),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  clearError: () => set({ error: null }),
}));
