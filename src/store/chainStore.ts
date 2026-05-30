import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChainRun, ChainProposal, ChainStatus, ChainMode, CostEstimate, OptimizerSuggestion, Message } from "@/types";
import type { RyoResult } from "@/lib/ryoParser";
import { generateId, now } from "@/lib/utils";

interface ChainStore {
  run: ChainRun;
  workspaceMessages: Message[];
  streamingText: string;
  streamingAgentId: string | null;
  proposal: ChainProposal | null;
  proposalLoading: boolean;
  // ── Mode de chaîne + formats + validation ────────────────────────
  chainMode: ChainMode;
  selectedFormats: string[];
  validationSettings: {
    enabled: boolean;
    agentsToValidate: "all" | "key" | "custom";
    customAgentIds: string[];
  };
  pendingValidationOutput: { agentId: string; content: string } | null;
  setSelectedFormats: (f: string[]) => void;
  setValidationSettings: (s: Partial<ChainStore["validationSettings"]>) => void;
  setPendingValidation: (v: { agentId: string; content: string } | null) => void;
  approveValidation: () => void;
  // ── Score Ryo + coût réel ─────────────────────────────────────
  ryoResult: RyoResult | null;
  realCost: number;
  chainStartTime: number | null;
  deliverablePath: string | null;
  lastDeliverableContent: string | null; // cache texte du dernier livrable (2.10)
  customConfig: {
    relayActive: boolean;
    marcusCheckActive: boolean;
    agentModels: Record<string, import("@/types").ModelId>; // overrides modèle par agent
  };
  costEstimate: CostEstimate | null;
  optimizerSuggestions: OptimizerSuggestion[];
  // ── ADN Projet + Relay ────────────────────────────────────────────
  projectDNA: string | null;          // bloc 150 tokens créé par Marcus
  relayOutputs: Record<string, string>; // résumés Relay par agent source (matrice deps)
  relayActive: boolean;               // true pendant qu'un Relay tourne
  relayForAgentId: string | null;     // ID du prochain agent que Relay prépare
  relaySavedTokens: number;           // tokens économisés cumulés par Relay
  relayCallCount: number;             // nombre de fois que Relay a tourné
  setProposal: (p: ChainProposal | null) => void;
  setProposalLoading: (v: boolean) => void;
  setChainMode: (mode: ChainMode) => void;
  setRyoResult: (r: RyoResult | null) => void;
  setRealCost: (c: number) => void;
  setChainStartTime: (t: number | null) => void;
  setDeliverablePath: (p: string | null) => void;
  setLastDeliverableContent: (c: string | null) => void;
  setCustomConfig: (config: Partial<ChainStore["customConfig"]>) => void;
  setCustomAgentModel: (agentId: string, model: import("@/types").ModelId) => void;
  setCostEstimate: (e: CostEstimate | null) => void;
  setOptimizerSuggestions: (s: OptimizerSuggestion[]) => void;
  applySuggestion: (id: string, agentIds: string[], updateAgentIds: (ids: string[]) => void) => void;
  setProjectDNA: (dna: string | null) => void;
  setRelayOutput: (agentId: string, summary: string) => void;
  getRelayOutput: (agentId: string) => string | undefined;
  clearRelayOutputs: () => void;
  setRelayActive: (active: boolean, forAgentId?: string | null) => void;
  addRelaySavings: (savedTokens: number) => void;
  startRun: () => void;
  setAgentIndex: (i: number) => void;
  addMessage: (msg: Omit<Message, "id" | "timestamp">) => void;
  completeRun: () => void;
  pauseForChef: () => void;
  resumeFromChef: () => void;
  errorRun: (error: string) => void;
  stopRun: () => void;
  pauseAfterCurrent: () => void;
  pausedAgentId: string | null;
  pausedAgentMessage: string | null;
  pauseForAgent: (agentId: string, message?: string) => void;  // 7.3
  resumeFromAgent: () => void;
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

export const useChainStore = create<ChainStore>()(
  persist(
    (set, get) => ({
      run: EMPTY_RUN,
      workspaceMessages: [],
      streamingText: "",
      streamingAgentId: null,
      proposal: null,
      proposalLoading: false,
      chainMode: "project" as ChainMode,
      selectedFormats: ["prompt_cc", "markdown"],
      validationSettings: { enabled: false, agentsToValidate: "key", customAgentIds: [] },
      pendingValidationOutput: null,
      pausedAgentId: null,
      pausedAgentMessage: null,

      setSelectedFormats: (f) => set({ selectedFormats: f }),
      setValidationSettings: (s) =>
        set((st) => ({ validationSettings: { ...st.validationSettings, ...s } })),
      setPendingValidation: (v) => set({ pendingValidationOutput: v }),
      approveValidation: () =>
        set((s) => ({ pendingValidationOutput: null, run: { ...s.run, status: "running" as ChainStatus } })),
      ryoResult: null,
      realCost: 0,
      chainStartTime: null,
      deliverablePath: null,
      lastDeliverableContent: null,
      customConfig: { relayActive: true, marcusCheckActive: true, agentModels: {} },
      costEstimate: null,
      optimizerSuggestions: [],
      projectDNA: null,
      relayOutputs: {},
      relayActive: false,
      relayForAgentId: null,
      relaySavedTokens: 0,
      relayCallCount: 0,

      setProposal: (p) => set({ proposal: p }),
      setProposalLoading: (v) => set({ proposalLoading: v }),
      setChainMode: (mode) => set({ chainMode: mode }),
      setRyoResult: (r) => set({ ryoResult: r }),
      setRealCost: (c) => set({ realCost: c }),
      setChainStartTime: (t) => set({ chainStartTime: t }),
      setDeliverablePath: (p) => set({ deliverablePath: p }),
      setLastDeliverableContent: (c) => set({ lastDeliverableContent: c }),
      setCustomConfig: (config) =>
        set((s) => ({ customConfig: { ...s.customConfig, ...config } })),
      setCustomAgentModel: (agentId, model) =>
        set((s) => ({
          customConfig: {
            ...s.customConfig,
            agentModels: { ...s.customConfig.agentModels, [agentId]: model },
          },
        })),
      setCostEstimate: (e) => set({ costEstimate: e }),
      setOptimizerSuggestions: (s) => set({ optimizerSuggestions: s }),
      applySuggestion: (id, agentIds, updateAgentIds) => {
        const suggestion = get().optimizerSuggestions.find((s) => s.id === id);
        if (!suggestion) return;
        if (suggestion.action === "remove-agent" && suggestion.agentId) {
          updateAgentIds(agentIds.filter((aid) => aid !== suggestion.agentId));
        }
        // Marquer la suggestion comme appliquée
        set((s) => ({
          optimizerSuggestions: s.optimizerSuggestions.filter((sg) => sg.id !== id),
        }));
      },
      setProjectDNA: (dna) => set({ projectDNA: dna }),
      setRelayOutput: (agentId, summary) =>
        set((s) => ({ relayOutputs: { ...s.relayOutputs, [agentId]: summary } })),
      getRelayOutput: (agentId) => get().relayOutputs[agentId],
      clearRelayOutputs: () => set({ relayOutputs: {} }),
      setRelayActive: (active, forAgentId = null) =>
        set({ relayActive: active, relayForAgentId: forAgentId }),
      addRelaySavings: (savedTokens) =>
        set((s) => ({
          relaySavedTokens: s.relaySavedTokens + savedTokens,
          relayCallCount: s.relayCallCount + 1,
        })),

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

      pauseAfterCurrent: () =>
        set((s) => ({ run: { ...s.run, status: "pausing" } })),

      pauseForAgent: (agentId, message) =>
        set((s) => ({
          run: { ...s.run, status: "paused_agent" as ChainStatus },
          pausedAgentId: agentId,
          pausedAgentMessage: message ?? null,
        })),

      resumeFromAgent: () =>
        set((s) => ({
          run: { ...s.run, status: "running" as ChainStatus },
          pausedAgentId: null,
          pausedAgentMessage: null,
        })),

      resetRun: () => set({
        run: EMPTY_RUN,
        pausedAgentId: null,
        pausedAgentMessage: null,
        relayOutputs: {},
        relayActive: false,
        relayForAgentId: null,
        relaySavedTokens: 0,
        relayCallCount: 0,
        projectDNA: null,
        ryoResult: null,
        realCost: 0,
        chainStartTime: null,
        deliverablePath: null,
      }),

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

      flushStreaming: () =>
        set((s) => {
          if (!s.streamingAgentId || !s.streamingText)
            return { streamingAgentId: null, streamingText: "" };
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
    }),
    {
      name: "ronako-chain-v1",
      // Persiste uniquement les messages et les résultats de chaîne.
      // Les états transitoires (streaming, proposal) ne sont PAS persistés.
      partialize: (s) => ({
        workspaceMessages: s.workspaceMessages,
        projectDNA: s.projectDNA,
        relayOutputs: s.relayOutputs,
        run: {
          ...s.run,
          status: "idle" as ChainStatus,
          currentAgentIndex: -1,
          startedAt: undefined,
        },
      }),
    }
  )
);
