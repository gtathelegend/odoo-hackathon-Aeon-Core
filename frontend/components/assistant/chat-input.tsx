"use client";
import { useState, useRef, useCallback } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, isStreaming, onStop, placeholder }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t border-outline-variant bg-surface">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={placeholder ?? "Ask AssetFlow AI..."}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-xl border border-outline-variant bg-surface-container px-4 py-2.5 text-body-sm text-on-surface placeholder:text-on-surface/50 focus:outline-none focus:ring-2 focus:ring-ink/20 disabled:opacity-50"
        aria-label="Chat message input"
      />
      {isStreaming ? (
        <button
          onClick={onStop}
          className="shrink-0 w-10 h-10 rounded-full bg-error flex items-center justify-center text-on-primary transition-colors hover:bg-error/80"
          aria-label="Stop generating"
        >
          <span className="material-symbols-outlined text-[20px]">stop</span>
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className="shrink-0 w-10 h-10 rounded-full bg-ink flex items-center justify-center text-on-primary transition-colors hover:bg-ink/80 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <span className="material-symbols-outlined text-[20px]">send</span>
        </button>
      )}
    </div>
  );
}
