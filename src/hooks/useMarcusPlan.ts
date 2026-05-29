import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { generateId } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";
import { useChainStore } from "@/store/chainStore";
import { MODEL_TIERS } from "@/types";
import type { ChainProposal } from "@/types";

const PLANNING_PROMPT = (agentList: string) => `Tu es Marcus, Chef d'Orchestre. Analyse la conversation ci-dessous et produis un plan d'exécution.

Agents disponibles (ID → rôle) :
${agentList}

Instructions :
1. Résume le brief de façon COMPLÈTE et adaptée à sa complexité. Si le brief est long et détaillé, le résumé doit l'être aussi — ne tronque rien d'important. Si le brief est court, reste concis. L'objectif : quelqu'un qui lit le résumé doit avoir toutes les informations pour exécuter la chaîne sans relire la conversation.
2. Sélectionne UNIQUEMENT les agents nécessaires à ce brief spécifique (pas tous les 13 si la moitié est inutile)
3. Donne une raison courte (max 8 mots) pour chaque agent choisi
4. Ordonne-les logiquement : stratégie/analyse → contenu/design → technique → validation/fusion
5. Inclus "ella" (fusion) si plusieurs agents produisent du contenu à consolider
6. Inclus "sam" (scribe) si une note technique pour Claude Code est utile en fin de chaîne

Réponds UNIQUEMENT avec ce JSON, sans texte autour, sans markdown :
{
  "brief": "Résumé complet et fidèle du brief",
  "agents": [
    {"id": "agent_id", "reason": "Raison courte"}
  ]
}`;

export function useMarcusPlan() {
  const { apiKey, hasValidApiKey } = useSettingsStore();
  const { agents, getTeam } = useAgentStore();
  const { workspaceMessages, setProposal, setProposalLoading } = useChainStore();

  const buildPlan = useCallback(async () => {
    if (!hasValidApiKey()) return;
    setProposalLoading(true);

    // Contexte de la conversation (12 derniers messages)
    const conversation = workspaceMessages
      .filter((m) => m.role !== "system")
      .slice(-12)
      .map((m) => (m.role === "user" ? `Utilisateur: ${m.content}` : `Marcus: ${m.content}`))
      .join("\n\n");

    // Liste des agents disponibles (pas les consultants système)
    const agentList = agents
      .filter((a) => !a.isSystem)
      .map((a) => `  ${a.id} → ${a.role}`)
      .join("\n");

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
          systemPrompt: PLANNING_PROMPT(agentList),
          userMessage: conversation || "Génère un plan par défaut pour un projet généraliste.",
          requestId,
        }).catch(() => resolve());
      };

      setup();
    });

    // Parser le JSON de réponse
    try {
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Pas de JSON trouvé");
      const parsed = JSON.parse(jsonMatch[0]) as ChainProposal;

      // Valider que les IDs existent
      const validAgentIds = new Set(agents.map((a) => a.id));
      const validAgents = parsed.agents.filter((a) => validAgentIds.has(a.id));

      setProposal({ brief: parsed.brief, agents: validAgents });
    } catch {
      // Fallback : utiliser l'équipe par défaut
      const defaultTeam = getTeam("alpha");
      const fallbackAgents = (defaultTeam?.agentIds ?? [])
        .slice(1) // skip marcus
        .map((id) => ({ id, reason: "Agent de l'équipe Alpha" }));
      setProposal({
        brief: conversation.slice(0, 200) || "Brief non défini",
        agents: fallbackAgents,
      });
    } finally {
      setProposalLoading(false);
    }
  }, [apiKey, hasValidApiKey, agents, workspaceMessages, setProposal, setProposalLoading, getTeam]);

  return { buildPlan };
}
