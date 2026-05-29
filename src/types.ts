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
  isSystem?: boolean;
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

export type ChainStatus = "idle" | "running" | "paused_chef" | "completed" | "error";

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
  orchestrator: "claude-opus-4-8" as ModelId,
  analyst: "claude-sonnet-4-6" as ModelId,
  specialist: "claude-haiku-4-5-20251001" as ModelId,
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
