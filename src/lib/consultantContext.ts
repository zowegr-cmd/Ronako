import { useAgentStore } from "@/store/agentStore";
import { useProjectStore } from "@/store/projectStore";
import { useChainStore } from "@/store/chainStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { FolderSummary } from "@/types";
import type { UserMemory } from "@/lib/userMemory";

interface ContextExtras {
  folderSummary?: FolderSummary | null;
  userMemory?: UserMemory | null;
}

// ─── Contexte injecté en tête du systemPrompt de chaque consultant ───────────
export function buildConsultantContext(
  consultantId: string,
  extras?: ContextExtras,
): string {
  const agents = useAgentStore.getState().agents;
  const project = useProjectStore.getState().getActiveProject();
  const chainState = useChainStore.getState();
  const settings = useSettingsStore.getState();

  const projectInfo = project
    ? `Projet actif : ${project.name}${project.path && project.path !== "/" ? ` (${project.path})` : ""}`
    : "Aucun projet actif";

  const folderInfo = extras?.folderSummary
    ? `Dossier : ${extras.folderSummary.total_files} fichiers — ${extras.folderSummary.tree.split("\n").slice(0, 5).join(", ")}`
    : "";

  const lastBrief = chainState.workspaceMessages
    .filter((m) => m.role === "user")
    .at(-1)?.content ?? "";

  const configuredConnectors = Object.entries(settings.connectorKeys ?? {})
    .filter(([, v]) => !!v)
    .map(([k]) => k)
    .join(", ") || "Aucun";

  switch (consultantId) {

    // ── Prompt Machine : liste complète des agents ────────────────────
    case "consultant-prompt": {
      const agentList = agents
        .map((a) =>
          `- ${a.name} | ID: ${a.id} | Rôle: ${a.role} | Modèle: ${a.model}\n  Prompt (début): ${a.systemPrompt.slice(0, 120)}...`
        )
        .join("\n");
      return `[CONTEXTE APP]\n${projectInfo}\n\nAGENTS DISPONIBLES (${agents.length}) :\n${agentList}\n[/CONTEXTE APP]`;
    }

    // ── Idéation : projet + brief en cours ───────────────────────────
    case "consultant-ideation": {
      const parts = [`[CONTEXTE APP]`, projectInfo];
      if (folderInfo) parts.push(folderInfo);
      if (lastBrief) parts.push(`Brief en cours : ${lastBrief.slice(0, 200)}`);
      const lastDeliverable = chainState.lastDeliverableContent;
      if (lastDeliverable) parts.push(`Dernier livrable (début) : ${lastDeliverable.slice(0, 150)}...`);
      parts.push("[/CONTEXTE APP]");
      return parts.join("\n");
    }

    // ── Veille Tech : stack + secteurs + agents ───────────────────────
    case "consultant-veille": {
      const secteurs = extras?.userMemory?.preferences.secteurs_frequents?.join(", ") || "Non détectés";
      const agentNames = agents.map((a) => a.name).join(", ");
      const parts = [
        "[CONTEXTE APP]",
        projectInfo,
        folderInfo || "",
        `Secteurs fréquents : ${secteurs}`,
        `Agents actifs : ${agentNames}`,
        "[/CONTEXTE APP]",
      ].filter(Boolean);
      return parts.join("\n");
    }

    // ── Nova : connecteurs configurés + agents et leurs outils ────────
    case "consultant-nova": {
      const agentTools = agents
        .map((a) => `- ${a.name}: outils=[${a.tools.join(", ") || "aucun"}] connecteurs=[${a.connectors?.join(", ") || "aucun"}]`)
        .join("\n");
      return `[CONTEXTE APP]\n${projectInfo}\nConnecteurs configurés : ${configuredConnectors}\n\nAgents et connecteurs :\n${agentTools}\n[/CONTEXTE APP]`;
    }

    default:
      return `[CONTEXTE APP]\n${projectInfo}\n[/CONTEXTE APP]`;
  }
}
