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

// ─── Tool definitions (Phase 8) ──────────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolKeys {
  openai?: string;
  bfl?: string;
  e2b?: string;
  notion?: string;
  github?: string;
  tavily?: string;
  extra?: Record<string, string>;  // toutes les autres clés + configs custom
}

const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  openai: {
    name: "generate_image_dalle",
    description: "Génère une image haute qualité avec DALL-E 3. Utilise pour créer des illustrations, visuels, logos ou images pour un projet.",
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Description détaillée de l'image à générer en anglais" },
        size: { type: "string", enum: ["1024x1024", "1792x1024", "1024x1792"], description: "Taille de l'image" },
      },
      required: ["prompt"],
    },
  },
  bfl: {
    name: "generate_image_flux",
    description: "Génère une image avec Flux Pro. Plus rapide et moins cher que DALL-E. Utilise pour les itérations rapides.",
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Description de l'image à générer en anglais" },
      },
      required: ["prompt"],
    },
  },
  e2b: {
    name: "execute_code",
    description: "Exécute du code Python ou Node.js dans un environnement sécurisé. Peut générer des fichiers Excel (.xlsx), PDF, PowerPoint (.pptx) ou tout autre fichier.",
    input_schema: {
      type: "object",
      properties: {
        language: { type: "string", enum: ["python", "node"], description: "Langage de programmation" },
        code: { type: "string", description: "Code à exécuter" },
        packages: { type: "array", items: { type: "string" }, description: "Packages à installer (ex: ['openpyxl', 'reportlab'])" },
      },
      required: ["language", "code"],
    },
  },
  notion: {
    name: "export_to_notion",
    description: "Exporte le livrable directement dans Notion comme une nouvelle page.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Titre de la page" },
        content: { type: "string", description: "Contenu en Markdown" },
        database_id: { type: "string", description: "ID de la database Notion (optionnel)" },
      },
      required: ["title", "content"],
    },
  },
  github: {
    name: "github_push",
    description: "Pousse du contenu dans un repository GitHub.",
    input_schema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Format owner/repo" },
        path: { type: "string", description: "Chemin du fichier dans le repo" },
        content: { type: "string", description: "Contenu du fichier" },
        message: { type: "string", description: "Message de commit" },
      },
      required: ["repo", "path", "content", "message"],
    },
  },
  tavily: {
    name: "web_search",
    description: "Effectue une recherche web en temps réel via Tavily. Utilise pour obtenir des informations actuelles ou vérifier des données.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Requête de recherche" },
        max_results: { type: "integer", description: "Nombre maximum de résultats (défaut: 5)" },
      },
      required: ["query"],
    },
  },
};

/** Définition générique pour toute API du catalogue sans implémentation dédiée */
function genericApiTool(id: string, name: string, description: string): ToolDefinition {
  return {
    name: `api_${id}`,
    description: `${name} — ${description} Utilise l'endpoint approprié selon le besoin.`,
    input_schema: {
      type: "object",
      properties: {
        endpoint: { type: "string", description: "Chemin de l'endpoint (ex: /v1/resources) ou URL complète" },
        method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"], description: "Méthode HTTP" },
        body: { type: "object", description: "Body JSON de la requête (optionnel)" },
      },
      required: ["endpoint"],
    },
  };
}

/**
 * Construit les définitions d'outils pour un agent selon ses connecteurs actifs.
 * Tout connecteur peut être assigné à tout agent — aucune restriction.
 * Inclut : outils Phase 8 dédiés + APIs génériques + connecteurs HTTP custom.
 */
export function buildToolDefinitions(
  connectorIds: string[],
  toolKeys: ToolKeys,
  customConnectors?: Array<{ id: string; name: string; description: string; url: string; method: string; authType: string; authHeader?: string; keyField: string; bodyTemplate?: string }>,
): ToolDefinition[] {
  const defs: ToolDefinition[] = [];

  for (const id of connectorIds) {
    // Outils avec implémentation Rust dédiée (Phase 8)
    if (TOOL_DEFINITIONS[id]) {
      const key = toolKeys[id as keyof ToolKeys] as string | undefined
        ?? toolKeys.extra?.[id];
      if (key) defs.push(TOOL_DEFINITIONS[id]);
      continue;
    }

    // API générique du catalogue (sans implémentation dédiée)
    if (id.startsWith("custom_")) continue; // traité séparément

    const extraKey = toolKeys.extra?.[id];
    if (extraKey) {
      // Chercher le nom/description dans l'extra (passé par chainRunner)
      const apiName = toolKeys.extra?.[`__name_${id}`] ?? id;
      const apiDesc = toolKeys.extra?.[`__desc_${id}`] ?? `API ${id}`;
      defs.push(genericApiTool(id, apiName, apiDesc));
    }
  }

  // Connecteurs HTTP custom
  if (customConnectors) {
    for (const c of customConnectors) {
      if (!connectorIds.includes(`custom_${c.id}`)) continue;
      const hasKey = !!(toolKeys.extra?.[c.keyField] || c.authType === "none");
      if (!hasKey) continue;
      defs.push({
        name: `custom_${c.id}`,
        description: c.description || `API custom : ${c.name}`,
        input_schema: {
          type: "object",
          properties: {
            input: { type: "string", description: "Données à envoyer à l'API" },
            endpoint_override: { type: "string", description: "Override de l'endpoint (optionnel)" },
          },
          required: [],
        },
      });
    }
  }

  return defs;
}

export type { ToolDefinition as ToolDef };
