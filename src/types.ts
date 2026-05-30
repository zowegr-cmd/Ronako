export type ModelId =
  | "claude-opus-4-8"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5-20251001";

export type AgentTool = "web_search" | "image_gen" | "file_read";

export type AgentStatus = "idle" | "running" | "done" | "error";

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  model: ModelId;
  temperature: number; // 0–100
  systemPrompt: string;
  colors: [string, string];
  tools: AgentTool[];
  connectors?: string[];
  isSystem?: boolean;
  pauseAfter?: boolean;   // 7.3 — pause chaîne après cet agent
  pauseMessage?: string;  // message de pause personnalisé
}

export interface Team {
  id: string;
  name: string;
  agentIds: string[];
  enableChefOption: boolean;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  teamId: string;
  createdAt: string;
  updatedAt: string;
  lastOpened: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  agentId?: string;
  timestamp: string;
  tokens?: number;
  cost?: number;
}

export type ChainStatus = "idle" | "running" | "paused_chef" | "paused_agent" | "pausing" | "completed" | "error";

export interface ChainRun {
  status: ChainStatus;
  currentAgentIndex: number;
  messages: Message[];
  totalTokens: number;
  totalCost: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ModelCostRate {
  input: number;
  output: number;
}

export const MODEL_LABELS: Record<ModelId, string> = {
  "claude-opus-4-8": "Opus 4",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5-20251001": "Haiku 4.5",
};

export const MODEL_TIERS = {
  orchestrator: "claude-opus-4-8" as ModelId,   // Réservé au Mode Infini (Phase 1.6)
  analyst:      "claude-sonnet-4-6" as ModelId,  // Réflexion + créativité
  specialist:   "claude-haiku-4-5-20251001" as ModelId, // Exécution + structure
  relay:        "claude-sonnet-4-6" as ModelId,  // Distillation de contexte
  fast:         "claude-haiku-4-5-20251001" as ModelId, // Alias rapide
} as const;

export const MODEL_COST_RATES: Record<ModelId, ModelCostRate> = {
  "claude-opus-4-8": { input: 0.15, output: 0.75 },
  "claude-sonnet-4-6": { input: 0.03, output: 0.15 },
  "claude-haiku-4-5-20251001": { input: 0.0025, output: 0.0125 },
};

export interface FileEntry {
  path: string;
  content: string;
  size: number;
  extension: string;
}

export interface FolderSummary {
  root: string;
  tree: string;
  files: FileEntry[];
  total_files: number;
  total_size_kb: number;
  skipped_files: number;
  truncated: boolean;
}

// ─── Skills ──────────────────────────────────────────────────────────────────
export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;           // texte injecté dans le prompt (100-200 tokens)
  agentIds: string[];        // agents concernés
  isActive: boolean;
  isTemporary: boolean;      // nettoyé après la chaîne
  inheritToAll: boolean;     // si sur Marcus, injecté partout
  triggerKeywords: string[]; // mots-clés qui activent le skill automatiquement
  sector?: string;
  createdBy: "system" | "user" | "ai";
  createdAt: string;
  useCount: number;
  avgScoreImpact: number;
  packId?: string;           // ID du pack source (custom packs)
}

export interface SkillPack {
  id: string;
  name: string;
  icon: string;
  description: string;
  sector: string;
  skills: Array<Omit<Skill, "createdAt" | "useCount" | "avgScoreImpact">>;
}

export type ConnectorStatus = "active" | "inactive" | "missing_key";

export interface AgentConnector {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: "native" | "api" | "mcp";
  isActive: boolean;
  requiresApiKey: boolean;
  apiKeySettingId?: string;
  status: ConnectorStatus;
}

// ─── Modes de chaîne ─────────────────────────────────────────────────────────
export type ChainMode = "flash" | "project" | "infinite" | "custom";

// ─── Bibliothèque livrables ───────────────────────────────────────────────────
export interface DeliverableEntry {
  id: string;
  path: string;
  date: string;
  brief: string;       // 100 premiers chars
  mode: ChainMode;
  agents: string[];
  score: number;
  realCost: number;    // centimes
  duration: number;    // secondes
}

export interface DeliverableData extends DeliverableEntry {
  dna: string;
  outputs: Record<string, string>;
  finalDeliverable: string;
  ryoWeaknesses: string[];
}

// ─── Suggestions de l'Optimiseur ─────────────────────────────────────────────
export interface OptimizerSuggestion {
  id: string;
  axis: "cost" | "speed" | "quality";
  description: string;
  action: "remove-agent" | "upgrade-model" | "downgrade-model" | "parallel" | "change-mode";
  agentId?: string;
  targetModel?: ModelId;
  savings?: number; // économie estimée en centimes
}

// ─── Estimation de coût ───────────────────────────────────────────────────────
export interface CostEstimate {
  min: number;
  max: number;
  mid: number;
  breakdown: Array<{ agentId: string; agentName: string; model: ModelId; estimatedCents: number; isRelay: boolean }>;
  tokensEstimate: number;
  savingsVsNaive: number;
  relayCallCount: number;
}

export interface ProposedAgent {
  id: string;
  reason: string;
}

export interface ChainProposal {
  brief: string;
  agents: ProposedAgent[];
}

export const MODEL_TIER_COLOR: Record<ModelId, string> = {
  "claude-opus-4-8": "#A259FF",
  "claude-sonnet-4-6": "#007AFF",
  "claude-haiku-4-5-20251001": "#30D158",
};
