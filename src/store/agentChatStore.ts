import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Message } from "@/types";
import { generateId, now } from "@/lib/utils";

export interface GeneratedFile {
  id: string;
  name: string;
  local_path: string;
  size_bytes: number;
  agentId: string;
  timestamp: string;
}

interface AgentChatStore {
  // Conversations par agent (persistées)
  messagesByAgent: Record<string, Message[]>;
  // Agent actuellement sélectionné
  activeAgentId: string;
  // Streaming
  streamingText: string;
  streamingAgentId: string | null;
  // Fichiers générés par tool use
  generatedFiles: GeneratedFile[];

  // Accesseur de commodité
  getMessages: (agentId: string) => Message[];

  // Actions
  setActiveAgent: (id: string) => void;
  addMessage: (agentId: string, msg: Omit<Message, "id" | "timestamp">) => void;
  setStreaming: (agentId: string | null) => void;
  appendStreaming: (text: string) => void;
  flushStreaming: () => void;
  clearConversation: (agentId: string) => void;
  addGeneratedFile: (file: Omit<GeneratedFile, "id" | "timestamp">) => void;
  clearFiles: (agentId: string) => void;
}

export const useAgentChatStore = create<AgentChatStore>()(
  persist(
    (set, get) => ({
      messagesByAgent: {},
      activeAgentId: "marcus",
      streamingText: "",
      streamingAgentId: null,
      generatedFiles: [],

      getMessages: (agentId) => get().messagesByAgent[agentId] ?? [],

      setActiveAgent: (id) => set({ activeAgentId: id }),

      addMessage: (agentId, msg) =>
        set((s) => ({
          messagesByAgent: {
            ...s.messagesByAgent,
            [agentId]: [
              ...(s.messagesByAgent[agentId] ?? []),
              { ...msg, id: generateId(), timestamp: now() },
            ],
          },
        })),

      setStreaming: (agentId) => set({ streamingAgentId: agentId, streamingText: "" }),

      appendStreaming: (text) =>
        set((s) => ({ streamingText: s.streamingText + text })),

      flushStreaming: () => {
        const { streamingText, streamingAgentId } = get();
        if (streamingAgentId && streamingText.trim()) {
          get().addMessage(streamingAgentId, {
            role: "assistant",
            agentId: streamingAgentId,
            content: streamingText,
          });
        }
        set({ streamingText: "", streamingAgentId: null });
      },

      clearConversation: (agentId) =>
        set((s) => ({
          messagesByAgent: { ...s.messagesByAgent, [agentId]: [] },
          generatedFiles: s.generatedFiles.filter((f) => f.agentId !== agentId),
        })),

      addGeneratedFile: (file) =>
        set((s) => ({
          generatedFiles: [
            ...s.generatedFiles,
            { ...file, id: generateId(), timestamp: now() },
          ],
        })),

      clearFiles: (agentId) =>
        set((s) => ({
          generatedFiles: s.generatedFiles.filter((f) => f.agentId !== agentId),
        })),
    }),
    {
      name: "ronako-agent-chats-v1",
      partialize: (s) => ({
        messagesByAgent: s.messagesByAgent,
        activeAgentId: s.activeAgentId,
        generatedFiles: s.generatedFiles,
      }),
    }
  )
);
