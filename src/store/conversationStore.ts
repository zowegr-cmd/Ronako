import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateId, now } from "@/lib/utils";
import { parseActionBlocks } from "@/lib/consultantActions";
import type { ConsultantAction } from "@/lib/consultantActions";

export interface ConvMessage {
  id: string;
  role: "user" | "assistant" | "streaming";
  content: string;      // texte nettoyé (sans blocs ACTION)
  rawContent?: string;  // texte original complet
  timestamp: string;
  actions?: ConsultantAction[]; // actions parsées depuis la réponse
}

interface ConversationStore {
  conversations: Record<string, ConvMessage[]>;
  addMessage: (agentId: string, msg: Omit<ConvMessage, "id" | "timestamp">) => void;
  updateLastMessage: (agentId: string, content: string) => void;
  // finalizeStreaming : parse les blocs ACTION à la fin
  finalizeStreaming: (agentId: string, fullContent: string) => void;
  clearConversation: (agentId: string) => void;
  getMessages: (agentId: string) => ConvMessage[];
}

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      conversations: {},

      addMessage: (agentId, msg) =>
        set((s) => ({
          conversations: {
            ...s.conversations,
            [agentId]: [
              ...(s.conversations[agentId] ?? []),
              { ...msg, id: generateId(), timestamp: now() },
            ],
          },
        })),

      updateLastMessage: (agentId, content) =>
        set((s) => {
          const list = [...(s.conversations[agentId] ?? [])];
          if (list.length === 0) return s;
          list[list.length - 1] = { ...list[list.length - 1], content };
          return { conversations: { ...s.conversations, [agentId]: list } };
        }),

      // Finalise le streaming : parse les blocs ACTION et stocke séparément
      finalizeStreaming: (agentId, fullContent) =>
        set((s) => {
          const list = [...(s.conversations[agentId] ?? [])];
          if (list.length === 0) return s;
          const { cleanText, actions } = parseActionBlocks(fullContent);
          list[list.length - 1] = {
            ...list[list.length - 1],
            role: "assistant",
            content: cleanText,
            rawContent: fullContent,
            actions: actions.length > 0 ? actions : undefined,
          };
          return { conversations: { ...s.conversations, [agentId]: list } };
        }),

      clearConversation: (agentId) =>
        set((s) => {
          const next = { ...s.conversations };
          delete next[agentId];
          return { conversations: next };
        }),

      getMessages: (agentId) => get().conversations[agentId] ?? [],
    }),
    { name: "ronako-conversations-v1" }
  )
);
