import type { Agent, Skill } from "@/types";

interface AgentContextOptions {
  agents: Agent[];
  skills: Skill[];
  configuredConnectors: string[];
  selectedFormats?: string[];
  chainMode?: string;
}

/**
 * Génère la description temps-réel de tous les agents disponibles pour Marcus.
 * Seule source de vérité : les stores (agentStore, connectorStore).
 * Aucun nom d'agent hardcodé dans les prompts Marcus — tout arrive via ce bloc.
 */
export function buildMarcusAgentContext(options: AgentContextOptions): string {
  const {
    agents,
    skills,
    configuredConnectors,
    selectedFormats = [],
    chainMode = "project",
  } = options;

  // Marcus ne se propose pas lui-même
  const availableAgents = agents.filter((a) => a.id !== "marcus");

  if (availableAgents.length === 0) return "[AUCUN AGENT DISPONIBLE]";

  const agentBlocks = availableAgents.map((agent) => {
    const agentSkills = skills.filter(
      (s) => s.agentIds.includes(agent.id) && s.isActive,
    );
    const activeConnectors = (agent.connectors ?? []).filter((c) =>
      configuredConnectors.includes(c),
    );

    const lines = [
      `  ${agent.name} [${agent.id}]`,
      `    Rôle : ${agent.role}`,
    ];

    if (agent.description) {
      lines.push(`    Spécialité : ${agent.description}`);
    }
    if (agentSkills.length > 0) {
      lines.push(`    Skills actifs : ${agentSkills.map((s) => s.name).join(", ")}`);
    }
    if (activeConnectors.length > 0) {
      lines.push(`    Connecteurs : ${activeConnectors.join(", ")}`);
    }
    if (agent.pauseAfter) {
      lines.push(`    Pause validation : oui`);
    }

    return lines.join("\n");
  });

  const formatsBlock =
    selectedFormats.length > 0
      ? `\nFORMAT(S) DEMANDÉ(S) : ${selectedFormats.join(", ")}`
      : "";

  return `[AGENTS DISPONIBLES — Temps réel]\n${agentBlocks.join("\n\n")}\n\nMODE CHAÎNE : ${chainMode}${formatsBlock}\n`;
}

/**
 * Version compacte pour PLANNING_PROMPT — id + rôle + spécialité (1 ligne par agent).
 */
export function buildMarcusAgentList(
  agents: Agent[],
  skills: Skill[],
  configuredConnectors: string[],
): string {
  return agents
    .filter((a) => a.id !== "marcus" && !a.isSystem)
    .map((a) => {
      const activeSkillNames = skills
        .filter((s) => s.agentIds.includes(a.id) && s.isActive)
        .map((s) => s.name);
      const activeConns = (a.connectors ?? []).filter((c) =>
        configuredConnectors.includes(c),
      );
      const extras: string[] = [];
      if (activeSkillNames.length) extras.push(`skills: ${activeSkillNames.join(", ")}`);
      if (activeConns.length) extras.push(`outils: ${activeConns.join(", ")}`);
      const extrasStr = extras.length ? ` — ${extras.join(" | ")}` : "";
      return `  ${a.id} → ${a.role}${a.description ? ` (${a.description})` : ""}${extrasStr}`;
    })
    .join("\n");
}
