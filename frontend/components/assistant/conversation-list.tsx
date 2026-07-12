"use client";
import { useEffect } from "react";
import { useAssistantStore } from "../../store/assistant.store";

interface ConversationListProps {
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function ConversationList({ onSelect, onNew }: ConversationListProps) {
  const conversations = useAssistantStore((s) => s.conversations);
  const currentId = useAssistantStore((s) => s.currentConversationId);
  const loadConversations = useAssistantStore((s) => s.loadConversations);
  const deleteConversation = useAssistantStore((s) => s.deleteConversation);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-outline-variant">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ink text-on-primary text-body-sm font-medium hover:bg-ink/80 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="text-center text-on-surface/50 text-body-sm py-8">No conversations yet</p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {conversations.map((conv) => (
              <li
                key={conv.id}
                className={`group flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-surface-container transition-colors ${
                  currentId === conv.id ? "bg-surface-container" : ""
                }`}
              >
                <button
                  onClick={() => onSelect(conv.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-body-sm text-on-surface truncate">{conv.title || "Untitled"}</p>
                  <p className="text-label-caps text-on-surface/50 mt-0.5">
                    {conv._count?.messages ?? 0} messages
                  </p>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-on-surface/40 hover:text-error transition-all"
                  aria-label={`Delete conversation: ${conv.title}`}
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
