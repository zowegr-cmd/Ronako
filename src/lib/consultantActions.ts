import { useAgentStore } from "@/store/agentStore";
import { useChainStore } from "@/store/chainStore";
import { useToastStore } from "@/store/toastStore";
import type { Agent } from "@/types";
import { MODEL_TIERS } from "@/types";

// ─── Types d'actions ─────────────────────────────────────────────────────────
export type ActionType =
  | "create_agent"
  | "update_agent"
  | "create_skill"
  | "send_to_marcus"
  | "enrich_brief"
  | "suggest_mcp"
  | "install_connector";

export interface ConsultantAction {
  type: ActionType;
  label: string;
  data: Record<string, unknown>;
  confirmRequired: boolean;
}

// ─── Couleurs et icônes par type ─────────────────────────────────────────────
export const ACTION_CONFIG: Record<ActionType, { color: string; icon: string }> = {
  create_agent:      { color: "#3B82F6", icon: "✨" },
  update_agent:      { color: "#8B5CF6", icon: "✏️" },
  create_skill:      { color: "#6366F1", icon: "⚡" },
  send_to_marcus:    { color: "#F59E0B", icon: "🎯" },
  enrich_brief:      { color: "#F59E0B", icon: "✍️" },
  suggest_mcp:       { color: "#10B981", icon: "🔌" },
  install_connector: { color: "#10B981", icon: "🔑" },
};

// ─── Parseur de blocs ACTION dans les réponses IA ────────────────────────────
export function parseActionBlocks(text: string): {
  cleanText: string;
  actions: ConsultantAction[];
} {
  const actions: ConsultantAction[] = [];
  // Regex plus souple : accepte single/double quotes + variations de formatage
  const pattern = /```ACTION\s*([\s\S]*?)\s*ACTION```/g;

  const cleanText = text
    .replace(pattern, (_, jsonStr: string) => {
      try {
        // Normaliser : guillemets simples → doubles, vraies apostrophes
        const normalized = jsonStr
          .replace(/'/g, '"')
          .replace(/([{,]\s*)"?(\w+)"?\s*:/g, '$1"$2":'); // ensure keys are quoted
        const action = JSON.parse(normalized) as ConsultantAction;
        if (action.type && action.label) actions.push(action);
      } catch {
        // Bloc malformé — on ignore silencieusement
      }
      return ""; // retirer le bloc du texte affiché
    })
    .replace(/\n{3,}/g, "\n\n") // nettoyer les sauts de ligne multiples
    .trim();

  return { cleanText, actions };
}

// ─── Exécution des actions ────────────────────────────────────────────────────
export async function executeAction(action: ConsultantAction): Promise<void> {
  const agentStore = useAgentStore.getState();
  const chainStore = useChainStore.getState();
  const toast = useToastStore.getState();

  switch (action.type) {

    // ── Créer un agent ──────────────────────────────────────────────
    case "create_agent": {
      const data = action.data as Partial<Agent> & { name?: string; role?: string };
      const agent = agentStore.addAgent({
        name: data.name ?? "Nouvel agent",
        role: data.role ?? "Agent spécialisé",
        description: (data.description as string) ?? "",
        model: (data.model as Agent["model"]) ?? MODEL_TIERS.analyst,
        temperature: (data.temperature as number) ?? 70,
        systemPrompt: (data.systemPrompt as string) ?? "",
        colors: (data.colors as [string, string]) ?? ["#6366F1", "#8B5CF6"],
        tools: (data.tools as Agent["tools"]) ?? [],
        isSystem: false,
      });
      toast.success(`✓ Agent ${agent.name} créé`, "Visible dans Agent Studio");
      break;
    }

    // ── Mettre à jour le prompt d'un agent ──────────────────────────
    case "update_agent": {
      const { agentId, systemPrompt, ...rest } = action.data as {
        agentId: string; systemPrompt?: string; [k: string]: unknown
      };
      if (!agentId) { toast.error("Action invalide", "agentId manquant"); return; }
      const updates: Partial<Agent> = {};
      if (systemPrompt) updates.systemPrompt = systemPrompt as string;
      if (rest.name) updates.name = rest.name as string;
      if (rest.temperature) updates.temperature = rest.temperature as number;
      agentStore.updateAgent(agentId, updates);
      const agent = agentStore.getAgent(agentId);
      toast.success(`✓ ${agent?.name ?? agentId} mis à jour`, "Prompt appliqué");
      break;
    }

    // ── Créer un skill (ajouter au systemPrompt de l'agent) ─────────
    case "create_skill": {
      const { agentId, skillContent, skillName } = action.data as {
        agentId: string; skillContent: string; skillName: string
      };
      if (!agentId || !skillContent) { toast.error("Action invalide", "Données manquantes"); return; }
      const agent = agentStore.getAgent(agentId);
      if (!agent) { toast.error("Agent introuvable", agentId); return; }
      agentStore.updateAgent(agentId, {
        systemPrompt: `${agent.systemPrompt}\n\n## Skill : ${skillName}\n${skillContent}`,
      });
      toast.success(`✓ Skill installé sur ${agent.name}`, skillName);
      break;
    }

    // ── Envoyer à Marcus ────────────────────────────────────────────
    case "send_to_marcus": {
      const { message } = action.data as { message: string };
      chainStore.addWorkspaceMessage({ role: "user", content: message });
      // Naviguer vers le workspace via event
      document.dispatchEvent(new CustomEvent("navigate-workspace"));
      toast.info("✓ Brief envoyé à Marcus", "Workspace ouvert");
      break;
    }

    // ── Enrichir le brief en cours ──────────────────────────────────
    case "enrich_brief": {
      const { enrichedBrief } = action.data as { enrichedBrief: string };
      document.dispatchEvent(new CustomEvent("brief-update", { detail: enrichedBrief }));
      toast.success("✓ Brief enrichi", "Textarea mis à jour");
      break;
    }

    // ── Suggérer / Configurer un MCP ────────────────────────────────
    case "suggest_mcp": {
      const { name, installCmd, requiresApiKey } = action.data as {
        name: string; installCmd?: string; requiresApiKey?: boolean
      };
      // Ouvrir Settings sur la section connecteurs
      document.dispatchEvent(new CustomEvent("open-settings-connectors", { detail: name }));
      if (requiresApiKey) {
        toast.info(`Configurer ${name}`, "Ouvrez Paramètres → Connecteurs");
      } else {
        toast.info(`MCP recommandé : ${name}`, installCmd ? `npm: ${installCmd}` : "");
      }
      break;
    }

    // ── Installer/Activer un connecteur sur un agent ─────────────────
    case "install_connector": {
      const { agentId, connectorId } = action.data as {
        agentId: string; connectorId: string
      };
      if (agentId) {
        const agent = agentStore.getAgent(agentId);
        if (agent) {
          agentStore.updateAgent(agentId, {
            connectors: [...(agent.connectors ?? []), connectorId],
          });
          toast.success(`✓ ${connectorId} activé sur ${agent.name}`, "");
        }
      }
      break;
    }

    default:
      toast.warning("Action inconnue", (action as ConsultantAction).type);
  }
}
