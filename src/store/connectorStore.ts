import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";

export interface CustomHttpConnector {
  id: string;
  name: string;
  description: string;
  url: string;              // URL template avec {{variable}} optionnel
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  authType: "bearer" | "apikey_header" | "none";
  authHeader?: string;      // Nom du header (ex: "X-API-Key")
  keyField: string;         // Clé keyring pour l'authentification
  bodyTemplate?: string;    // JSON template avec {{variable}} optionnel
  outputPath?: string;      // JSONPath pour extraire le résultat
}

interface ConnectorStore {
  // Clés API de tous les connecteurs (cache depuis keyring)
  keys: Record<string, string>;
  // Connecteurs HTTP custom définis par l'utilisateur
  customConnectors: CustomHttpConnector[];

  // Actions clés API
  setKey: (id: string, value: string) => Promise<void>;
  getKey: (id: string) => string;
  loadKey: (id: string) => Promise<void>;
  loadAllKnownKeys: () => Promise<void>;

  // Actions custom connectors
  addCustomConnector: (c: Omit<CustomHttpConnector, "id">) => void;
  updateCustomConnector: (id: string, updates: Partial<CustomHttpConnector>) => void;
  deleteCustomConnector: (id: string) => void;
}

// Tous les IDs de connecteurs connus (builtin + phase 8)
const KNOWN_CONNECTOR_IDS = [
  "openai", "bfl", "e2b", "notion", "github", "tavily", "screenshot",
  "replicate", "elevenlabs", "runway", "stability",
  "brave", "serper", "firecrawl", "apify",
  "airtable", "googlesheets", "slack", "linear", "jira",
  "gitlab", "vercel", "supabase",
  "sendgrid", "resend", "mailchimp", "twilio",
  "stripe", "hubspot", "salesforce", "pipedrive",
  "ga4", "mixpanel", "plausible",
];

export const useConnectorStore = create<ConnectorStore>()(
  persist(
    (set, get) => ({
      keys: {},
      customConnectors: [],

      setKey: async (id, value) => {
        await invoke("secure_set_key", { account: `ronako-connector-${id}`, secret: value });
        set((s) => ({ keys: { ...s.keys, [id]: value } }));
      },

      getKey: (id) => get().keys[id] ?? "",

      loadKey: async (id) => {
        try {
          const key = await invoke<string>("secure_get_key", { account: `ronako-connector-${id}` });
          set((s) => ({ keys: { ...s.keys, [id]: key } }));
        } catch {
          // Clé absente du keyring — normal
        }
      },

      loadAllKnownKeys: async () => {
        const results: Record<string, string> = {};
        await Promise.all(
          KNOWN_CONNECTOR_IDS.map(async (id) => {
            try {
              const key = await invoke<string>("secure_get_key", { account: `ronako-connector-${id}` });
              if (key) results[id] = key;
            } catch { /* absent */ }
          }),
        );
        set((s) => ({ keys: { ...s.keys, ...results } }));
      },

      addCustomConnector: (c) => {
        const connector: CustomHttpConnector = { ...c, id: `custom-${Date.now()}` };
        set((s) => ({ customConnectors: [...s.customConnectors, connector] }));
      },

      updateCustomConnector: (id, updates) =>
        set((s) => ({
          customConnectors: s.customConnectors.map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          ),
        })),

      deleteCustomConnector: (id) =>
        set((s) => ({
          customConnectors: s.customConnectors.filter((c) => c.id !== id),
        })),
    }),
    {
      name: "ronako-connectors-v1",
      // Ne pas persister les clés (elles viennent du keyring)
      partialize: (s) => ({
        customConnectors: s.customConnectors,
      }),
    },
  ),
);
