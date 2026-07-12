"use client";
import { useRef, useEffect, useState } from "react";
import { useAssistantStore } from "../../store/assistant.store";
import { ChatMessageBubble } from "./chat-message";
import { ChatInput } from "./chat-input";
import { ConversationList } from "./conversation-list";

export function FloatingAssistant() {
  const isOpen = useAssistantStore((s) => s.isOpen);
  const toggle = useAssistantStore((s) => s.toggle);
  const messages = useAssistantStore((s) => s.messages);
  const isLoading = useAssistantStore((s) => s.isLoading);
  const isStreaming = useAssistantStore((s) => s.isStreaming);
  const error = useAssistantStore((s) => s.error);
  const sendMessageStream = useAssistantStore((s) => s.sendMessageStream);
  const stopStreaming = useAssistantStore((s) => s.stopStreaming);
  const loadConversation = useAssistantStore((s) => s.loadConversation);
  const newConversation = useAssistantStore((s) => s.newConversation);
  const clearError = useAssistantStore((s) => s.clearError);

  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        className="fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full bg-ink text-on-primary shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open AI assistant"
      >
        <span className="material-symbols-outlined text-[28px]">smart_toy</span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] w-[400px] h-[600px] max-h-[80vh] bg-surface rounded-2xl shadow-2xl border border-outline-variant flex flex-col overflow-hidden"
      role="dialog"
      aria-label="AI Assistant"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-ink text-on-primary rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[22px]">smart_toy</span>
          <div>
            <h2 className="text-body-sm font-medium">AssetFlow AI</h2>
            <p className="text-[11px] text-on-primary/70">Powered by Grok</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            aria-label={showHistory ? "Back to chat" : "Conversation history"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {showHistory ? "chat" : "history"}
            </span>
          </button>
          <button
            onClick={() => {
              newConversation();
              setShowHistory(false);
            }}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            aria-label="New conversation"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
          <button
            onClick={toggle}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            aria-label="Close assistant"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </div>

      {/* Body */}
      {showHistory ? (
        <ConversationList
          onSelect={(id) => {
            loadConversation(id);
            setShowHistory(false);
          }}
          onNew={() => {
            newConversation();
            setShowHistory(false);
          }}
        />
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <span className="material-symbols-outlined text-[48px] text-on-surface/20 mb-4">
                  smart_toy
                </span>
                <h3 className="text-body-sm font-medium text-on-surface/70 mb-2">
                  How can I help?
                </h3>
                <p className="text-label-caps text-on-surface/50">
                  Ask about assets, maintenance, bookings, or get insights from your data.
                </p>
                <div className="mt-6 grid grid-cols-1 gap-2 w-full">
                  {[
                    "Show me overdue maintenance",
                    "Summarize this week's activity",
                    "Which assets need attention?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessageStream(suggestion)}
                      className="text-left px-3 py-2 rounded-lg border border-outline-variant text-body-sm text-on-surface/70 hover:bg-surface-container transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => <ChatMessageBubble key={msg.id} message={msg} />)
            )}
            {isLoading && !isStreaming && (
              <div className="flex justify-start mb-3">
                <div className="bg-surface-container rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-on-surface/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-on-surface/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-on-surface/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mb-2 px-3 py-2 bg-error/10 border border-error/20 rounded-lg flex items-center justify-between">
              <p className="text-label-caps text-error truncate">{error}</p>
              <button onClick={clearError} className="text-error/60 hover:text-error ml-2">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* Input */}
          <ChatInput
            onSend={(msg) => sendMessageStream(msg)}
            disabled={isLoading}
            isStreaming={isStreaming}
            onStop={stopStreaming}
          />
        </>
      )}
    </div>
  );
}
