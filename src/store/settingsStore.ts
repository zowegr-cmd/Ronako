import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";

const KEY_ACCOUNT = "anthropic-api-key";

interface SettingsStore {
  // La clé n'est plus stockée dans le state — elle est dans le keyring OS.
  // On garde juste un flag booléen (chargé au démarrage).
  apiKey: string; // en mémoire seulement pour les appels en cours
  keyLoaded: boolean;
  soundEnabled: boolean;
  monthlyBudgetCap: number;
  monthlySpend: number;
  sessionSpend: number;
  loadApiKey: () => Promise<void>;
  saveApiKey: (key: string) => Promise<void>;
  deleteApiKey: () => Promise<void>;
  setSoundEnabled: (v: boolean) => void;
  setMonthlyBudgetCap: (cap: number) => void;
  addSpend: (cents: number) => void;
  resetSessionSpend: () => void;
  hasValidApiKey: () => boolean;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      apiKey: "",
      keyLoaded: false,
      soundEnabled: true,
      monthlyBudgetCap: 500,
      monthlySpend: 0,
      sessionSpend: 0,

      loadApiKey: async () => {
        try {
          const key = await invoke<string>("secure_get_key", { account: KEY_ACCOUNT });
          set({ apiKey: key, keyLoaded: true });
        } catch {
          // Aucune clé stockée — normal au premier lancement
          set({ apiKey: "", keyLoaded: true });
        }
      },

      saveApiKey: async (key: string) => {
        await invoke("secure_set_key", { account: KEY_ACCOUNT, secret: key });
        set({ apiKey: key });
      },

      deleteApiKey: async () => {
        try { await invoke("secure_delete_key", { account: KEY_ACCOUNT }); } catch { /* déjà absente */ }
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

      hasValidApiKey: () => {
        const k = get().apiKey;
        return k.startsWith("sk-ant-") && k.length > 20;
      },
    }),
    {
      name: "ronako-settings-v2",
      // On ne persiste PAS apiKey dans localStorage — c'est dans le keyring OS.
      partialize: (s) => ({
        soundEnabled: s.soundEnabled,
        monthlyBudgetCap: s.monthlyBudgetCap,
        monthlySpend: s.monthlySpend,
      }),
    }
  )
);
