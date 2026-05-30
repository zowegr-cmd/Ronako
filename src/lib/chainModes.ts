import type { ModelId } from "@/types";

export type ChainMode = "flash" | "project" | "infinite" | "custom";

export type ModelOverride = "all-haiku" | "all-opus" | "optimized" | "user-defined";

export interface ChainModeConfig {
  id: ChainMode;
  label: string;
  icon: string;
  description: string;
  shortDesc: string;
  color: string;
  defaultAgents?: string[];     // suggestion d'agents (jamais forcé)
  modelOverride: ModelOverride;
  relayActive: boolean;
  marcusCheckActive: boolean;
  contextMode: "minimal" | "standard" | "full";
  doubleValidation: boolean;     // Ryo tourne 2x si score < 9
  estimatedCost: { min: number; max: number } | null; // en centimes d'€
  estimatedTime: { min: number; max: number } | null; // en secondes
  useCase: string;
  isDefault?: boolean;
  requiresConfirmation?: boolean;
  badge?: string;
}

export const CHAIN_MODES: Record<ChainMode, ChainModeConfig> = {
  flash: {
    id: "flash",
    label: "Éclair",
    icon: "⚡",
    description: "Direction ultra-rapide",
    shortDesc: "Tout Haiku · sans Relay · sans Marcus Check",
    color: "#F59E0B",
    defaultAgents: ["marcus", "leo", "sam"],  // suggestion, pas forcé
    modelOverride: "all-haiku",
    relayActive: false,
    marcusCheckActive: false,
    contextMode: "minimal",
    doubleValidation: false,
    estimatedCost: { min: 1, max: 3 },       // centimes
    estimatedTime: { min: 30, max: 90 },
    useCase: "Valider une idée en 60 secondes",
  },

  project: {
    id: "project",
    label: "Projet",
    icon: "🎯",
    description: "Livrable complet et cohérent",
    shortDesc: "Mix Sonnet/Haiku · Relay actif · Marcus Check actif",
    color: "#6366F1",
    modelOverride: "optimized",
    relayActive: true,
    marcusCheckActive: true,
    contextMode: "standard",
    doubleValidation: false,
    estimatedCost: { min: 8, max: 25 },       // centimes
    estimatedTime: { min: 180, max: 360 },
    useCase: "Production standard — 90% des cas",
    isDefault: true,
  },

  infinite: {
    id: "infinite",
    label: "Infini",
    icon: "♾️",
    description: "Maximum possible sans limite",
    shortDesc: "Tout Opus 4 · contexte complet · sans Relay · double validation",
    color: "#8B5CF6",
    modelOverride: "all-opus",
    relayActive: false,       // chaque agent reçoit tout le contexte
    marcusCheckActive: true,
    contextMode: "full",
    doubleValidation: true,
    estimatedCost: { min: 200, max: 800 },    // centimes
    estimatedTime: { min: 900, max: 1800 },
    useCase: "Projet critique — pitch, lancement, document légal",
    requiresConfirmation: true,
    badge: "⚠️ Coût élevé",
  },

  custom: {
    id: "custom",
    label: "Custom",
    icon: "⚙️",
    description: "Configuration manuelle",
    shortDesc: "Modèle, Relay, contexte — tout configurable",
    color: "#6B7280",
    modelOverride: "user-defined",
    relayActive: true,
    marcusCheckActive: true,
    contextMode: "standard",
    doubleValidation: false,
    estimatedCost: null,
    estimatedTime: null,
    useCase: "Contrôle total",
  },
};

// ─── Résoudre le modèle d'un agent selon le mode ──────────────────────────────
export function resolveAgentModel(
  _agentId: string,
  defaultModel: ModelId,
  override: ModelOverride,
): ModelId {
  switch (override) {
    case "all-haiku":  return "claude-haiku-4-5-20251001";
    case "all-opus":   return "claude-opus-4-8";
    case "optimized":  return defaultModel; // déjà optimisé par agent dans defaultTeam
    case "user-defined": return defaultModel;
  }
}

// ─── Flash mode : agents forcés ──────────────────────────────────────────────
// Les agents ne sont JAMAIS forcés — seulement suggérés au changement de mode
export function getDefaultAgentsForMode(
  teamAgentIds: string[],
  mode: ChainMode,
): string[] {
  return CHAIN_MODES[mode].defaultAgents ?? teamAgentIds;
}
