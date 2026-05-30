import type { Agent, Message, ModelId, Skill } from "@/types";
import { generateId, now } from "@/lib/utils";
import { calculateCost, estimateTokens } from "@/lib/tokenCounter";
import { wrapDNA } from "@/lib/projectDNA";

const MAX_SKILLS = 5;
const MAX_PROMPT_TOKENS = 3800;

// ─── Construire le prompt enrichi avec les skills ─────────────────────────────
export function buildPromptWithSkills(
  agent: Agent,
  skills: Skill[],
  universalSkills: Skill[] = [],
): string {
  // Skills actifs pour cet agent + skills universels Marcus
  const agentSkills = skills
    .filter((s) => s.isActive && s.agentIds.includes(agent.id))
    .slice(0, MAX_SKILLS);

  const allSkills = [...universalSkills, ...agentSkills];
  if (allSkills.length === 0) return agent.systemPrompt;

  const skillsBlock = allSkills
    .map((s) => `=== ${s.name.toUpperCase()} ===\n${s.content}`)
    .join("\n\n");

  const enriched = `${agent.systemPrompt}\n\n${skillsBlock}`;

  // Vérifier que le prompt ne dépasse pas la limite
  if (estimateTokens(enriched) > MAX_PROMPT_TOKENS) {
    // Tronquer en gardant le prompt de base + max skills possible
    let result = agent.systemPrompt;
    for (const skill of allSkills) {
      const candidate = `${result}\n\n=== ${skill.name.toUpperCase()} ===\n${skill.content}`;
      if (estimateTokens(candidate) > MAX_PROMPT_TOKENS) break;
      result = candidate;
    }
    return result;
  }

  return enriched;
}

export interface ChainContext {
  projectName: string;
  projectState?: string;
  userBrief: string;
  folderContext?: string;
  projectDNA?: string;
  relayContext?: string;
  agentSkills?: Skill[];         // skills actifs pour cet agent
  universalSkills?: Skill[];     // skills universels Marcus (inheritToAll)
  deliverableLanguage?: string;  // 7.15 — langue des livrables
}

const LANGUAGE_LABELS: Record<string, string> = {
  fr: "Français", en: "English", es: "Español", de: "Deutsch",
};

export interface AgentResult {
  agentId: string;
  content: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

// ─── Construction du prompt pour un agent ────────────────────────────────────
// Structure optimisée Phase 1.2 :
//
//   1. ADN Projet          (~150 tokens)  — TOUJOURS en tête, TOUS les agents
//   2. Contexte Relay      (~150 tokens)  — résumé ciblé via matrice dépendances
//   3. Contexte dossier    (si activé)    — fichiers du projet
//   4. Instructions agent                 — tâche spécifique
//
// Total : ~500 tokens max (vs 2000-3000 sans Relay + matrice)
//
// ⛔ Le brief complet n'est JAMAIS envoyé aux agents N+1 — l'ADN suffit.

export function buildAgentPrompt(
  agent: Agent,
  context: ChainContext,
  previousOutput: string,
  agentIndex: number,
): string {
  // Prompt enrichi avec les skills actifs
  const enrichedSystemPrompt = buildPromptWithSkills(
    agent,
    context.agentSkills ?? [],
    context.universalSkills ?? [],
  );
  const agentWithSkills = { ...agent, systemPrompt: enrichedSystemPrompt };
  void agentWithSkills; // utilisé uniquement pour la référence

  const header = `[${agent.name} — ${agent.role}]\n\n`;
  const isFirst = agentIndex === 0;

  // ── Bloc langue — injecté si différent du français ────────────────────────
  const lang = context.deliverableLanguage;
  const langBlock = lang && lang !== "fr"
    ? `[LANGUE DU LIVRABLE : ${LANGUAGE_LABELS[lang] ?? lang}]\nProduis ton output intégralement en ${LANGUAGE_LABELS[lang] ?? lang}. L'interface reste en français mais ton livrable doit être en ${LANGUAGE_LABELS[lang] ?? lang}.\n\n`
    : "";

  // ── Bloc ADN — toujours en tête sauf pour Marcus (il génère le brief) ──────
  const dnaBlock = context.projectDNA && !isFirst
    ? `${wrapDNA(context.projectDNA)}\n\n`
    : "";

  // ── Contexte Relay — résumé ciblé via matrice dépendances ──────────────────
  const relayBlock = context.relayContext && !isFirst
    ? `[CONTEXTE RELAY — distillé pour toi]\n${context.relayContext}\n[/CONTEXTE RELAY]\n\n`
    : "";

  // ── Contexte fichiers — 1er agent ou file_read activé ──────────────────────
  const injectFiles = (isFirst || agent.tools.includes("file_read")) && context.folderContext;
  const fileBlock = injectFiles ? `${context.folderContext}\n\n` : "";

  if (isFirst) {
    // Marcus : brief complet + état projet + dossier
    return `${header}${langBlock}Projet : ${context.projectName}

Brief :
${context.userBrief}
${context.projectState ? `\nÉtat du projet :\n${context.projectState}\n` : ""}${fileBlock}
Traite ce brief selon ton rôle et produis ton output.`;
  }

  // Agents N+1 : ADN + Relay (jamais le brief complet)
  // Si Relay n'a pas tourné (fallback) → output précédent complet
  const contextBlock = relayBlock || (previousOutput
    ? `[OUTPUT PRÉCÉDENT]\n${previousOutput}\n[/OUTPUT PRÉCÉDENT]\n\n`
    : "");

  return `${header}${langBlock}${dnaBlock}${contextBlock}${fileBlock}Projet : ${context.projectName}

Traite ce contexte selon ton rôle. Sois précis et actionnable.`;
}

// ─── Prompt pour Relay ───────────────────────────────────────────────────────
export function buildRelayPrompt(
  dependencyContext: string,
  nextAgent: Agent,
  previousAgent?: Agent,
): string {
  const sourceInfo = previousAgent
    ? `Résumés disponibles (via matrice de dépendances) :\n${dependencyContext}`
    : `Output à distiller :\n${dependencyContext}`;

  return `${sourceInfo}

Agent suivant :
Nom : ${nextAgent.name}
Rôle : ${nextAgent.role}
Description : ${nextAgent.description}`;
}

export function resultToMessage(result: AgentResult, model: ModelId): Message {
  return {
    id: generateId(),
    role: "assistant",
    content: result.content,
    agentId: result.agentId,
    timestamp: now(),
    tokens: result.inputTokens + result.outputTokens,
    cost: calculateCost(model, result.inputTokens, result.outputTokens),
  };
}

export function mockAgentResponse(agent: Agent, prompt: string): AgentResult {
  const mockOutput = `[${agent.name} — ${agent.role}]\n\nOutput simulé (mode démo).\n\nTokens estimés : ${estimateTokens(prompt)}.`;
  const inputTokens = estimateTokens(prompt);
  const outputTokens = estimateTokens(mockOutput);
  return {
    agentId: agent.id,
    content: mockOutput,
    inputTokens,
    outputTokens,
    cost: calculateCost(agent.model, inputTokens, outputTokens),
  };
}
