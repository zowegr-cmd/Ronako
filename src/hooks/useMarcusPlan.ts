import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { generateId } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";
import { useChainStore } from "@/store/chainStore";
import { useConnectorStore } from "@/store/connectorStore";
import { enforceIndispensable } from "@/hooks/useChainOptimizer";
import { MODEL_TIERS } from "@/types";
import type { ChainProposal } from "@/types";
import { detectMissingSuggestions } from "@/lib/proactiveSuggestions";
import { buildMarcusAgentList } from "@/lib/buildMarcusAgentContext";
import { loadUserMemory } from "@/lib/userMemory";
import { detectChainTemplate } from "@/lib/adaptiveChain";

// ─── Prompt C — Composition de chaîne ────────────────────────────────────────
// Source : McKinsey team staffing model
//          hackingthecaseinterview.com/pages/mckinsey-consultant
// RÈGLE : Zéro nom d'agent hardcodé — les agents arrivent via ${agentList}
const buildPlanningPrompt = (
  agentList: string,
  conversationHistory: string,
  memoryContext: string,
  templateHint: string,
  persona: string,
  expertise: string,
  lang: string,
) => `Tu es Marcus, Directeur de Projet IA de Ronako.

<task>
Analyse la conversation ci-dessous.
Identifie le brief final.
Compose la chaîne d'agents optimale depuis les agents disponibles.
</task>

<composition_rules>
RÈGLE 1 — Chaîne minimale efficace
Minimum d'agents pour le maximum de qualité.
Chaque agent apporte une valeur unique.
Si 2 agents ont le même rôle → garder le plus spécialisé.

RÈGLE 2 — Sélection par capacités réelles
Lis [AGENTS DISPONIBLES] ci-dessous.
Choisis selon la description du rôle, les skills actifs et les connecteurs.
NE PAS choisir un agent absent de la liste.
NE PAS inventer un agent inexistant.

RÈGLE 3 — Agents de synthèse et validation
Si 3+ agents producteurs → ajouter l'agent de fusion si disponible.
Terminer par validation puis scribe si utile.
Ordre logique : analyse/stratégie → création → technique → fusion → validation → final.

RÈGLE 4 — Connecteurs influencent la composition
Agent avec connecteur de recherche actif → lui assigner les tâches data.
Agent avec E2B actif → l'inclure si format fichier demandé.

RÈGLE 5 — Patterns utilisateur${memoryContext ? `\n${memoryContext}` : "\nAucune habitude mémorisée."}

RÈGLE 6 — Justification obligatoire
Chaque agent = raison basée sur le brief réel (max 12 mots).
PAS "pour le SEO" — OUI "brief mentionne référencement Google + skill SEO actif".
</composition_rules>

[AGENTS DISPONIBLES]
${agentList}

${templateHint ? `[TEMPLATE DÉTECTÉ]\n${templateHint}\n` : ""}
[PERSONA MARCUS : ${persona}]
[NIVEAU UTILISATEUR : ${expertise}]
[LANGUE LIVRABLES : ${lang}]

<conversation>
${conversationHistory || "Aucune conversation disponible."}
</conversation>

<output_instruction>
Réponds UNIQUEMENT avec ce JSON valide. Zéro texte autour. Zéro markdown. Zéro agent hors de [AGENTS DISPONIBLES].
{
  "brief": "Résumé précis du brief en 2-3 phrases. La mission exacte de l'équipe.",
  "agents": [
    {
      "id": "id_exact_de_lagent",
      "reason": "Raison précise citant le brief ou les capacités — maximum 12 mots"
    }
  ]
}
</output_instruction>`;

export function useMarcusPlan() {
  const { apiKey, hasValidApiKey, getConnectorKey, ignoredSuggestions, marcusPersona, expertiseLevel, deliverableLanguage } = useSettingsStore();
  const { agents, getTeam, skills } = useAgentStore();
  const { keys: connectorKeys } = useConnectorStore();
  const { workspaceMessages, selectedFormats, chainMode, setProposal, setProposalLoading, addWorkspaceMessage } = useChainStore();

  const buildPlan = useCallback(async () => {
    if (!hasValidApiKey()) return;
    setProposalLoading(true);

    // ── Contexte de la conversation (12 derniers messages) ─────────────
    const conversation = workspaceMessages
      .filter((m) => m.role !== "system")
      .slice(-12)
      .map((m) => (m.role === "user" ? `Utilisateur: ${m.content}` : `Marcus: ${m.content}`))
      .join("\n\n");

    // ── Liste agents temps-réel ─────────────────────────────────────────
    const configuredConnectors = Object.entries(connectorKeys)
      .filter(([, v]) => v && v.trim() !== "")
      .map(([k]) => k);

    const agentList = buildMarcusAgentList(agents, skills, configuredConnectors);

    // ── Mémoire utilisateur → patterns ────────────────────────────────
    let memoryContext = "";
    try {
      const memory = await loadUserMemory();
      const { preferences: prefs, patterns } = memory;
      const lines: string[] = [];
      if (patterns.agents_souvent_retires.length) {
        lines.push(`Agents souvent retirés par l'utilisateur : ${patterns.agents_souvent_retires.join(", ")} → exclure par défaut.`);
      }
      if (patterns.agents_souvent_ajoutes.length) {
        lines.push(`Agents souvent ajoutés : ${patterns.agents_souvent_ajoutes.join(", ")} → favoriser.`);
      }
      if (prefs.secteurs_frequents.length) {
        lines.push(`Secteurs fréquents : ${prefs.secteurs_frequents.join(", ")}.`);
      }
      if (patterns.score_moyen > 0) {
        lines.push(`Score moyen passé : ${patterns.score_moyen.toFixed(1)}/10.`);
      }
      if (lines.length) memoryContext = lines.join("\n");
    } catch { /* silencieux */ }

    // ── Suggestion template adaptatif ──────────────────────────────────
    let templateHint = "";
    try {
      const template = detectChainTemplate(conversation, selectedFormats);
      if (template) {
        templateHint = `Type détecté : "${template.name}" — suggestion : ${template.agents.join(", ")} (${template.reasoning})`;
      }
    } catch { /* silencieux */ }

    // ── Appel Marcus (Sonnet) ──────────────────────────────────────────
    const marcus = agents.find((a) => a.id === "marcus") ?? agents[0];
    const requestId = generateId();
    let fullText = "";

    await new Promise<void>((resolve) => {
      const unlisteners: Array<() => void> = [];

      const setup = async () => {
        const unChunk = await listen<string>(`anthropic-chunk-${requestId}`, (ev) => {
          fullText += ev.payload;
        });
        const unDone = await listen<unknown>(`anthropic-done-${requestId}`, () => {
          unlisteners.forEach((fn) => fn());
          resolve();
        });
        const unErr = await listen<string>(`anthropic-error-${requestId}`, () => {
          unlisteners.forEach((fn) => fn());
          resolve();
        });
        unlisteners.push(unChunk, unDone, unErr);

        invoke("anthropic_stream", {
          apiKey,
          model: marcus?.model ?? MODEL_TIERS.orchestrator,
          systemPrompt: buildPlanningPrompt(
            agentList,
            conversation,
            memoryContext,
            templateHint,
            marcusPersona,
            expertiseLevel,
            deliverableLanguage,
          ),
          userMessage: conversation || "Génère un plan par défaut pour un projet généraliste.",
          requestId,
        }).catch(() => resolve());
      };

      setup();
    });

    // ── Parser le JSON de réponse ──────────────────────────────────────
    try {
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Pas de JSON trouvé");
      const parsed = JSON.parse(jsonMatch[0]) as ChainProposal;

      const validAgentIds = new Set(agents.map((a) => a.id));
      const rawAgents = parsed.agents.filter((a) => validAgentIds.has(a.id));
      const { result: validAgents } = enforceIndispensable(rawAgents, validAgentIds);

      setProposal({ brief: parsed.brief, agents: validAgents });

      // ── Suggestion proactive (max 1 par session) ───────────────────
      const activeSkills = skills.filter((s) => s.isActive);
      const installedConnectors = (["tavily","openai","bfl","e2b","notion","github","screenshot"] as const)
        .filter((c) => !!getConnectorKey(c));
      const suggestion = detectMissingSuggestions({
        brief: parsed.brief,
        activeSkills,
        installedConnectors,
        ignoredSuggestions,
      });
      if (suggestion) {
        addWorkspaceMessage({
          role: "system",
          content: `⚡SUGGESTION|${suggestion.action}|${suggestion.costImpact ?? ""}|${suggestion.actionLabel}|${suggestion.message}`,
        });
      }
    } catch {
      // Fallback : utiliser l'équipe par défaut sans Marcus
      const defaultTeam = getTeam("alpha");
      const fallbackAgents = (defaultTeam?.agentIds ?? [])
        .filter((id) => id !== "marcus")
        .map((id) => ({ id, reason: "Agent de l'équipe Alpha" }));
      setProposal({
        brief: conversation.slice(0, 200) || "Brief non défini",
        agents: fallbackAgents,
      });
    } finally {
      setProposalLoading(false);
    }
  }, [apiKey, hasValidApiKey, agents, skills, workspaceMessages, selectedFormats, chainMode, connectorKeys, marcusPersona, expertiseLevel, deliverableLanguage, setProposal, setProposalLoading, addWorkspaceMessage, getTeam, getConnectorKey, ignoredSuggestions]);

  return { buildPlan };
}
