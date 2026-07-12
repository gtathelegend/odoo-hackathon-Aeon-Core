"use client";
import type { LocalMessage } from "../../store/assistant.store";

interface ChatMessageProps {
  message: LocalMessage;
}

export function ChatMessageBubble({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-body-sm ${
          isUser
            ? "bg-ink text-on-primary rounded-br-md"
            : "bg-surface-container text-on-surface rounded-bl-md"
        } ${message.isStreaming ? "animate-pulse" : ""}`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        {message.isStreaming && !message.content && (
          <div className="flex gap-1 py-1">
            <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>
    </div>
  );
}
