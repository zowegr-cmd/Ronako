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
  agentSkills?: Skill[];
  universalSkills?: Skill[];
  deliverableLanguage?: string;
  activeToolNames?: string[];    // Phase 8 — noms des outils disponibles pour cet agent
  teamCapabilities?: string;     // Phase 9 — capacités skills/outils de toute l'équipe
  selectedFormats?: string[];    // Forge — formats de fichiers demandés
  chainAgentList?: string;       // Marcus V2 — liste agents de la chaîne (injecté pour agent 0)
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

  // ── Bloc formats — injecté si formats fichiers demandés ──────────────────
  const FILE_FORMAT_IDS = new Set(["pdf", "excel", "pptx", "word", "html_dashboard"]);
  const fileFormats = (context.selectedFormats ?? []).filter((f) => FILE_FORMAT_IDS.has(f));
  const formatsBlock = context.selectedFormats?.length
    ? `[FORMAT(S) DEMANDÉ(S) : ${context.selectedFormats.join(", ")}]\n${fileFormats.length > 0 ? `Forge produira les fichiers : ${fileFormats.join(", ")}.\n` : ""}Adapte ton output en conséquence.\n\n`
    : "";

  // ── Bloc ADN + capacités équipe ────────────────────────────────────────────
  const capBlock = context.teamCapabilities && !isFirst
    ? `\n${context.teamCapabilities}\n`
    : "";
  const dnaBlock = context.projectDNA && !isFirst
    ? `${wrapDNA(context.projectDNA + capBlock)}\n\n`
    : "";

  // ── Contexte Relay — résumé ciblé via matrice dépendances ──────────────────
  const relayBlock = context.relayContext && !isFirst
    ? `[CONTEXTE RELAY — distillé pour toi]\n${context.relayContext}\n[/CONTEXTE RELAY]\n\n`
    : "";

  // ── Contexte fichiers — 1er agent ou file_read activé ──────────────────────
  const injectFiles = (isFirst || agent.tools.includes("file_read")) && context.folderContext;
  const fileBlock = injectFiles ? `${context.folderContext}\n\n` : "";

  // ── Outils disponibles — informe l'agent de ses capacités ──────────────────
  const toolsBlock = context.activeToolNames?.length
    ? `[OUTILS DISPONIBLES]\n${context.activeToolNames.map((t) => `- ${t}`).join("\n")}\nUtilise ces outils quand c'est pertinent pour ta tâche.\n\n`
    : "";

  // ── Liste agents de la chaîne — injectée pour Marcus (agent 0) ───────────
  const chainAgentBlock = isFirst && context.chainAgentList
    ? `${context.chainAgentList}\n\n`
    : "";

  if (isFirst) {
    return `${header}${langBlock}${formatsBlock}${toolsBlock}${chainAgentBlock}Projet : ${context.projectName}

Brief :
${context.userBrief}
${context.projectState ? `\nÉtat du projet :\n${context.projectState}\n` : ""}${fileBlock}
Traite ce brief selon ton rôle et produis ton output.`;
  }

  const contextBlock = relayBlock || (previousOutput
    ? `[OUTPUT PRÉCÉDENT]\n${previousOutput}\n[/OUTPUT PRÉCÉDENT]\n\n`
    : "");

  return `${header}${langBlock}${formatsBlock}${toolsBlock}${dnaBlock}${contextBlock}${fileBlock}Projet : ${context.projectName}

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
    input_schema: { type: "object", properties: { query: { type: "string", description: "Requête de recherche" }, max_results: { type: "integer" } }, required: ["query"] },
  },

  // ── 15 nouveaux connecteurs Phase 10 ──────────────────────────────────────

  fal: {
    name: "generate_image_fal",
    description: "Génère une image via fal.ai (Nano Banana 2, Ideogram v3, Flux Pro). Rapide et varié.",
    input_schema: { type: "object", properties: { model_id: { type: "string", description: "ID du modèle (ex: fal-ai/nano-banana-2, fal-ai/flux-pro/v1.1)" }, prompt: { type: "string", description: "Description de l'image en anglais" }, aspect_ratio: { type: "string", enum: ["1:1", "16:9", "9:16", "4:3"], description: "Format" }, num_images: { type: "integer", description: "Nombre d'images (1-4)" } }, required: ["prompt"] },
  },
  "fal-video": {
    name: "generate_video_fal",
    description: "Génère une vidéo via fal.ai (HappyHorse, Kling, Veo). Texte ou image vers vidéo.",
    input_schema: { type: "object", properties: { model_id: { type: "string", description: "ex: alibaba/happy-horse/text-to-video, fal-ai/kling-video/v2.1" }, prompt: { type: "string", description: "Description de la vidéo" }, image_url: { type: "string", description: "URL d'une image source (image-to-video)" }, duration: { type: "integer", description: "Durée en secondes (5-15)" } }, required: ["prompt"] },
  },
  gemini: {
    name: "generate_image_gemini",
    description: "Génère une image avec Google Gemini Flash. Multimodal Google.",
    input_schema: { type: "object", properties: { prompt: { type: "string", description: "Description de l'image" }, model: { type: "string", description: "Modèle Gemini (défaut: gemini-3.1-flash-image-preview)" } }, required: ["prompt"] },
  },
  ideogram: {
    name: "generate_image_ideogram",
    description: "Génère une image avec texte parfaitement lisible via Ideogram 3. Idéal pour logos et affiches.",
    input_schema: { type: "object", properties: { prompt: { type: "string", description: "Description de l'image avec texte à intégrer" }, aspect_ratio: { type: "string", enum: ["ASPECT_1_1", "ASPECT_16_9", "ASPECT_9_16", "ASPECT_4_3"], description: "Format" }, model: { type: "string", description: "V_3 (défaut)" } }, required: ["prompt"] },
  },
  serper: {
    name: "google_search",
    description: "Recherche Google en temps réel via Serper.dev. Résultats récents et structurés.",
    input_schema: { type: "object", properties: { query: { type: "string", description: "Requête Google" }, num_results: { type: "integer", description: "Nombre de résultats (défaut: 10)" }, country: { type: "string", description: "Code pays (ex: fr, us)" } }, required: ["query"] },
  },
  perplexity: {
    name: "perplexity_search",
    description: "Recherche web avec réponse synthétisée et citations de sources. Idéal pour la veille.",
    input_schema: { type: "object", properties: { query: { type: "string", description: "Question ou sujet à rechercher" } }, required: ["query"] },
  },
  openai_tts: {
    name: "text_to_speech_openai",
    description: "Synthèse vocale haute qualité via OpenAI TTS. Génère un MP3. Voix: nova, alloy, echo, fable, onyx, shimmer.",
    input_schema: { type: "object", properties: { text: { type: "string", description: "Texte à synthétiser (max 4096 chars)" }, voice: { type: "string", enum: ["nova", "alloy", "echo", "fable", "onyx", "shimmer"], description: "Voix" }, model: { type: "string", enum: ["tts-1", "tts-1-hd"], description: "Qualité" } }, required: ["text"] },
  },
  deepgram: {
    name: "transcribe_audio_deepgram",
    description: "Transcription audio ultra-rapide via Deepgram Nova 3. Plus précis que Whisper.",
    input_schema: { type: "object", properties: { audio_url: { type: "string", description: "URL publique du fichier audio" }, language: { type: "string", description: "Code langue (ex: fr, en)" } }, required: ["audio_url"] },
  },
  resend: {
    name: "send_email",
    description: "Envoie un email transactionnel via Resend. HTML supporté.",
    input_schema: { type: "object", properties: { to: { type: "string", description: "Email destinataire" }, subject: { type: "string", description: "Objet" }, html: { type: "string", description: "Corps HTML de l'email" }, from: { type: "string", description: "Expéditeur (défaut: noreply@resend.dev)" } }, required: ["to", "subject", "html"] },
  },
  twilio_sms: {
    name: "send_sms",
    description: "Envoie un SMS via Twilio. Notifications et alertes.",
    input_schema: { type: "object", properties: { to: { type: "string", description: "Numéro destinataire (format E.164: +33...)" }, message: { type: "string", description: "Texte du SMS (max 160 chars)" } }, required: ["to", "message"] },
  },
  maps: {
    name: "search_places",
    description: "Recherche des lieux, commerces, adresses via Google Maps. Retourne noms, notes, horaires.",
    input_schema: { type: "object", properties: { query: { type: "string", description: "Recherche (ex: restaurant paris 8)" }, location: { type: "string", description: "Zone géographique (optionnel)" } }, required: ["query"] },
  },
  weather: {
    name: "get_weather",
    description: "Météo en temps réel pour n'importe quelle ville (température, humidité, vent).",
    input_schema: { type: "object", properties: { city: { type: "string", description: "Nom de la ville" }, country: { type: "string", description: "Code pays ISO (ex: fr, us)" } }, required: ["city"] },
  },
  hunter: {
    name: "find_emails",
    description: "Trouve les emails professionnels associés à un domaine via Hunter.io.",
    input_schema: { type: "object", properties: { domain: { type: "string", description: "Nom de domaine (ex: company.com)" }, limit: { type: "integer", description: "Nombre max d'emails (défaut: 10)" } }, required: ["domain"] },
  },
  groq: {
    name: "groq_completion",
    description: "LLM ultra-rapide via Groq (Llama 3.3 70B). 10× plus rapide que Claude Haiku. Pour tâches rapides.",
    input_schema: { type: "object", properties: { prompt: { type: "string", description: "Prompt utilisateur" }, model: { type: "string", enum: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"], description: "Modèle Groq" }, system: { type: "string", description: "Prompt système (optionnel)" } }, required: ["prompt"] },
  },
  firecrawl: {
    name: "scrape_url",
    description: "Scrape une URL et retourne le contenu en Markdown propre. Idéal pour analyser des pages web.",
    input_schema: { type: "object", properties: { url: { type: "string", description: "URL à scraper" }, only_main_content: { type: "boolean", description: "Contenu principal uniquement (défaut: true)" } }, required: ["url"] },
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

/** Extrait les variables `{{nom}}` d'un template */
export function extractTemplateVars(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
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
    // fal.ai : inclure image ET vidéo quand connector "fal" est actif
    if (id === "fal") {
      const key = toolKeys.extra?.["fal"];
      if (key) {
        defs.push(TOOL_DEFINITIONS["fal"]);
        defs.push(TOOL_DEFINITIONS["fal-video"]);
      }
      continue;
    }

    // Outils avec implémentation Rust dédiée (Phase 8 + Phase 10)
    if (TOOL_DEFINITIONS[id]) {
      const key = (toolKeys[id as keyof ToolKeys] as string | undefined)
        ?? toolKeys.extra?.[id];
      if (key) defs.push(TOOL_DEFINITIONS[id]);
      continue;
    }

    // API générique du catalogue
    if (id.startsWith("custom_")) continue;

    const extraKey = toolKeys.extra?.[id];
    if (extraKey) {
      const apiName = toolKeys.extra?.[`__name_${id}`] ?? id;
      const apiDesc = toolKeys.extra?.[`__desc_${id}`] ?? `API ${id}`;
      defs.push(genericApiTool(id, apiName, apiDesc));
    }
  }

  // Connecteurs HTTP custom — schéma généré depuis les variables du template
  if (customConnectors) {
    for (const c of customConnectors) {
      if (!connectorIds.includes(`custom_${c.id}`)) continue;
      const hasKey = !!(toolKeys.extra?.[c.keyField] || c.authType === "none");
      if (!hasKey) continue;

      // Extraire les variables {{...}} de l'URL et du body
      const urlVars = extractTemplateVars(c.url);
      const bodyVars = extractTemplateVars(c.bodyTemplate ?? "");
      const allVars = [...new Set([...urlVars, ...bodyVars])];

      const properties: Record<string, { type: string; description: string }> = {};
      for (const v of allVars) {
        properties[v] = { type: "string", description: `Valeur pour le paramètre "${v}"` };
      }
      // Fallback si aucune variable détectée
      if (allVars.length === 0) {
        properties.input = { type: "string", description: "Données à envoyer à l'API" };
      }

      defs.push({
        name: `custom_${c.id}`,
        description: `${c.description || `Connecteur HTTP : ${c.name}`} [${c.method} ${c.url.split("?")[0].slice(0, 60)}]`,
        input_schema: {
          type: "object",
          properties,
          required: allVars.slice(0, 3), // max 3 requis
        },
      });
    }
  }

  return defs;
}

export type { ToolDefinition as ToolDef };
