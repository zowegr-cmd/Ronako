import { create } from "zustand";
import type { ChainRun, ChainProposal, Message } from "@/types";
import { generateId, now } from "@/lib/utils";

interface ChainStore {
  run: ChainRun;
  workspaceMessages: Message[];
  streamingText: string;
  streamingAgentId: string | null;
  proposal: ChainProposal | null;
  proposalLoading: boolean;
  setProposal: (p: ChainProposal | null) => void;
  setProposalLoading: (v: boolean) => void;
  startRun: () => void;
  setAgentIndex: (i: number) => void;
  addMessage: (msg: Omit<Message, "id" | "timestamp">) => void;
  completeRun: () => void;
  pauseForChef: () => void;
  resumeFromChef: () => void;
  errorRun: (error: string) => void;
  stopRun: () => void;
  resetRun: () => void;
  addWorkspaceMessage: (msg: Omit<Message, "id" | "timestamp">) => void;
  clearWorkspace: () => void;
  setStreaming: (agentId: string | null, text?: string) => void;
  appendStreaming: (chunk: string) => void;
  flushStreaming: () => void;
}

const EMPTY_RUN: ChainRun = {
  status: "idle",
  currentAgentIndex: -1,
  messages: [],
  totalTokens: 0,
  totalCost: 0,
};

export const useChainStore = create<ChainStore>()((set) => ({
  run: EMPTY_RUN,
  workspaceMessages: [],
  streamingText: "",
  streamingAgentId: null,
  proposal: null,
  proposalLoading: false,

  setProposal: (p) => set({ proposal: p }),
  setProposalLoading: (v) => set({ proposalLoading: v }),

  startRun: () =>
    set(() => ({
      run: { ...EMPTY_RUN, status: "running", currentAgentIndex: 0, startedAt: now() },
    })),

  setAgentIndex: (i) =>
    set((s) => ({ run: { ...s.run, currentAgentIndex: i } })),

  addMessage: (msg) =>
    set((s) => {
      const full: Message = { ...msg, id: generateId(), timestamp: now() };
      return {
        run: {
          ...s.run,
          messages: [...s.run.messages, full],
          totalTokens: s.run.totalTokens + (msg.tokens ?? 0),
          totalCost: s.run.totalCost + (msg.cost ?? 0),
        },
      };
    }),

  completeRun: () =>
    set((s) => ({ run: { ...s.run, status: "completed", completedAt: now() } })),

  pauseForChef: () =>
    set((s) => ({ run: { ...s.run, status: "paused_chef" } })),

  resumeFromChef: () =>
    set((s) => ({ run: { ...s.run, status: "running" } })),

  errorRun: (error) =>
    set((s) => ({ run: { ...s.run, status: "error", error } })),

  stopRun: () =>
    set((s) => ({ run: { ...s.run, status: "idle" } })),

  resetRun: () => set({ run: EMPTY_RUN }),

  addWorkspaceMessage: (msg) =>
    set((s) => ({
      workspaceMessages: [
        ...s.workspaceMessages,
        { ...msg, id: generateId(), timestamp: now() },
      ],
    })),

  clearWorkspace: () => set({ workspaceMessages: [] }),

  setStreaming: (agentId, text = "") =>
    set({ streamingAgentId: agentId, streamingText: text }),

  appendStreaming: (chunk) =>
    set((s) => ({ streamingText: s.streamingText + chunk })),

  // Déplace le message en streaming vers la liste permanente
  flushStreaming: () =>
    set((s) => {
      if (!s.streamingAgentId || !s.streamingText) return { streamingAgentId: null, streamingText: "" };
      const msg: Message = {
        id: generateId(),
        role: "assistant",
        content: s.streamingText,
        agentId: s.streamingAgentId,
        timestamp: now(),
      };
      return {
        workspaceMessages: [...s.workspaceMessages, msg],
        streamingAgentId: null,
        streamingText: "",
      };
    }),
}));
