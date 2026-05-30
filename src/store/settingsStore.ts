import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";

const KEY_ACCOUNT = "anthropic-api-key";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export interface ConnectorKeys {
  tavily?: string;
  openai?: string;
  bfl?: string;
  e2b?: string;
  notion?: string;
  github?: string;
  screenshot?: string;
}

export type MarcusPersona = "direct" | "detailed" | "coach" | "expert";
export type AppTheme = "mineral" | "arctic" | "forest" | "sunset";
export type ExpertiseLevel = "beginner" | "intermediate" | "expert";
export type DeliverableLanguage = "fr" | "en" | "es" | "de";

export interface ChainPreset {
  id: string;
  name: string;
  selectedFormats: string[];
  chainMode: import("@/types").ChainMode;
  relayActive: boolean;
  marcusCheckActive: boolean;
}

interface SettingsStore {
  apiKey: string;
  keyLoaded: boolean;
  soundEnabled: boolean;
  monthlyBudgetCap: number;
  monthlySpend: number;
  lastResetMonth: string;
  sessionSpend: number;
  connectorKeys: ConnectorKeys;
  // ── Phase 7 ───────────────────────────────────────────────────
  hasSeenTour: boolean;        // 7.1 — product tour
  marcusPersona: MarcusPersona; // 7.9
  theme: AppTheme;             // 7.12
  expertiseLevel: ExpertiseLevel; // 7.14
  deliverableLanguage: DeliverableLanguage; // 7.15
  focusMode: boolean;          // 7.10
  chainPresets: ChainPreset[]; // 7.8
  ignoredSuggestions: Record<string, number>; // 7.7
  setHasSeenTour: (v: boolean) => void;
  setMarcusPersona: (p: MarcusPersona) => void;
  setTheme: (t: AppTheme) => void;
  setExpertiseLevel: (l: ExpertiseLevel) => void;
  setDeliverableLanguage: (lang: DeliverableLanguage) => void;
  setFocusMode: (v: boolean) => void;
  addChainPreset: (preset: Omit<ChainPreset, "id">) => void;
  deleteChainPreset: (id: string) => void;
  incrementIgnoredSuggestion: (action: string) => void;
  loadApiKey: () => Promise<void>;
  saveApiKey: (key: string) => Promise<void>;
  deleteApiKey: () => Promise<void>;
  setSoundEnabled: (v: boolean) => void;
  setMonthlyBudgetCap: (cap: number) => void;
  addSpend: (cents: number) => void;
  resetSessionSpend: () => void;
  resetMonthlySpend: () => void;
  checkMonthlyReset: () => void;
  hasValidApiKey: () => boolean;
  setConnectorKey: (name: keyof ConnectorKeys, value: string) => Promise<void>;
  getConnectorKey: (name: keyof ConnectorKeys) => string;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      apiKey: "",
      keyLoaded: false,
      soundEnabled: true,
      monthlyBudgetCap: 500,
      monthlySpend: 0,
      lastResetMonth: currentMonth(),
      sessionSpend: 0,
      connectorKeys: {},
      hasSeenTour: false,
      marcusPersona: "direct" as MarcusPersona,
      theme: "mineral" as AppTheme,
      expertiseLevel: "intermediate" as ExpertiseLevel,
      deliverableLanguage: "fr" as DeliverableLanguage,
      focusMode: false,
      chainPresets: [],
      ignoredSuggestions: {},

      setHasSeenTour: (v) => set({ hasSeenTour: v }),
      setMarcusPersona: (p) => set({ marcusPersona: p }),
      setTheme: (t) => {
        set({ theme: t });
        document.documentElement.setAttribute("data-theme", t);
      },
      setExpertiseLevel: (l) => set({ expertiseLevel: l }),
      setDeliverableLanguage: (lang) => set({ deliverableLanguage: lang }),
      setFocusMode: (v) => set({ focusMode: v }),
      addChainPreset: (preset) => set((s) => ({
        chainPresets: [...s.chainPresets, { ...preset, id: `preset-${Date.now()}` }],
      })),
      deleteChainPreset: (id) => set((s) => ({ chainPresets: s.chainPresets.filter((p) => p.id !== id) })),
      incrementIgnoredSuggestion: (action) => set((s) => ({
        ignoredSuggestions: { ...s.ignoredSuggestions, [action]: (s.ignoredSuggestions[action] ?? 0) + 1 },
      })),

      loadApiKey: async () => {
        try {
          const key = await invoke<string>("secure_get_key", { account: KEY_ACCOUNT });
          set({ apiKey: key, keyLoaded: true });
        } catch {
          set({ apiKey: "", keyLoaded: true });
        }
      },

      saveApiKey: async (key) => {
        await invoke("secure_set_key", { account: KEY_ACCOUNT, secret: key });
        set({ apiKey: key });
      },

      deleteApiKey: async () => {
        try { await invoke("secure_delete_key", { account: KEY_ACCOUNT }); } catch { /* ok */ }
        set({ apiKey: "" });
      },

      setSoundEnabled: (v) => set({ soundEnabled: v }),
      setMonthlyBudgetCap: (cap) => set({ monthlyBudgetCap: cap }),

      addSpend: (cents) =>
        set((s) => ({
          monthlySpend: s.monthlySpend + cents,
          sessionSpend: s.sessionSpend + cents,
        })),

      resetSessionSpend: () => set({ sessionSpend: 0 }),

      resetMonthlySpend: () =>
        set({ monthlySpend: 0, lastResetMonth: currentMonth() }),

      // Appelé au chargement de l'app — reset auto si nouveau mois
      checkMonthlyReset: () => {
        const { lastResetMonth, resetMonthlySpend } = get();
        if (lastResetMonth !== currentMonth()) resetMonthlySpend();
      },

      hasValidApiKey: () => {
        const k = get().apiKey;
        return k.startsWith("sk-ant-") && k.length > 20;
      },

      // Clés connecteurs — toutes via keyring OS
      setConnectorKey: async (name, value) => {
        await invoke("secure_set_key", { account: `ronako-connector-${name}`, secret: value });
        set((s) => ({ connectorKeys: { ...s.connectorKeys, [name]: value } }));
      },

      getConnectorKey: (name) => get().connectorKeys[name] ?? "",
    }),
    {
      name: "ronako-settings-v3",
      partialize: (s) => ({
        soundEnabled: s.soundEnabled,
        monthlyBudgetCap: s.monthlyBudgetCap,
        monthlySpend: s.monthlySpend,
        lastResetMonth: s.lastResetMonth,
        connectorKeys: s.connectorKeys,
        hasSeenTour: s.hasSeenTour,
        marcusPersona: s.marcusPersona,
        theme: s.theme,
        expertiseLevel: s.expertiseLevel,
        deliverableLanguage: s.deliverableLanguage,
        focusMode: s.focusMode,
        chainPresets: s.chainPresets,
        ignoredSuggestions: s.ignoredSuggestions,
      }),
    }
  )
);
