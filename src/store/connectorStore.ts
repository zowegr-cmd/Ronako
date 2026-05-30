import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";

export interface McpTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface CustomMcpEntry {
  id: string;
  name: string;
  description: string;
  package: string;
  icon: string;
  extraArgs?: string;  // arguments CLI supplémentaires (ex: chemin pour filesystem)
}

export interface McpServerState {
  status: "stopped" | "starting" | "running" | "error";
  tools: McpTool[];
  errorMsg?: string;
}

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
  keys: Record<string, string>;
  customConnectors: CustomHttpConnector[];
  customMcps: CustomMcpEntry[];

  setKey: (id: string, value: string) => Promise<void>;
  deleteKey: (id: string) => Promise<void>;
  getKey: (id: string) => string;
  loadKey: (id: string) => Promise<void>;
  loadAllKnownKeys: () => Promise<void>;
  migrateFromSettings: () => void;

  addCustomConnector: (c: Omit<CustomHttpConnector, "id">) => void;
  updateCustomConnector: (id: string, updates: Partial<CustomHttpConnector>) => void;
  deleteCustomConnector: (id: string) => void;

  addCustomMcp: (mcp: Omit<CustomMcpEntry, "id">) => void;
  removeCustomMcp: (id: string) => void;
  // MCP runtime state (non persisté)
  mcpStates: Record<string, McpServerState>;
  setMcpState: (id: string, state: McpServerState) => void;
  clearMcpState: (id: string) => void;
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
      customMcps: [],
      mcpStates: {},

      setKey: async (id, value) => {
        await invoke("secure_set_key", { account: `ronako-connector-${id}`, secret: value });
        set((s) => ({ keys: { ...s.keys, [id]: value } }));
      },

      deleteKey: async (id) => {
        try { await invoke("secure_delete_key", { account: `ronako-connector-${id}` }); } catch { /* ok */ }
        set((s) => {
          const next = { ...s.keys };
          delete next[id];
          return { keys: next };
        });
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

      migrateFromSettings: () => {
        // Migre les anciennes clés de settingsStore vers connectorStore
        try {
          const raw = localStorage.getItem("ronako-settings-v3");
          if (!raw) return;
          const parsed = JSON.parse(raw) as { state?: { connectorKeys?: Record<string, string> } };
          const oldKeys = parsed?.state?.connectorKeys;
          if (!oldKeys) return;
          const current = get().keys;
          const merged: Record<string, string> = {};
          for (const [k, v] of Object.entries(oldKeys)) {
            if (v && !current[k]) {
              merged[k] = v;
              // Migrer aussi dans le keyring
              invoke("secure_set_key", { account: `ronako-connector-${k}`, secret: v }).catch(() => {});
            }
          }
          if (Object.keys(merged).length > 0) {
            set((s) => ({ keys: { ...merged, ...s.keys } }));
          }
        } catch { /* silencieux */ }
      },

      addCustomMcp: (mcp) => set((s) => ({
        customMcps: [...s.customMcps, { ...mcp, id: `mcp-${Date.now()}` }],
      })),
      removeCustomMcp: (id) => set((s) => ({
        customMcps: s.customMcps.filter((m) => m.id !== id),
        mcpStates: Object.fromEntries(Object.entries(s.mcpStates).filter(([k]) => k !== id)),
      })),
      setMcpState: (id, state) => set((s) => ({ mcpStates: { ...s.mcpStates, [id]: state } })),
      clearMcpState: (id) => set((s) => {
        const next = { ...s.mcpStates };
        delete next[id];
        return { mcpStates: next };
      }),

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
      partialize: (s) => ({
        customConnectors: s.customConnectors,
        customMcps: s.customMcps,
      }),
    },
  ),
);
