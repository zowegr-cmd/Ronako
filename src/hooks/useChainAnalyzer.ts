import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { generateId } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";
import type { OptimizerSuggestion, ModelId } from "@/types";
import type { ChainMode } from "@/lib/chainModes";

const ANALYZER_SYSTEM = `Tu es un agent optimiseur de chaînes IA. Tu analyses une chaîne d'agents et tu proposes des optimisations concrètes selon 3 axes : coût, vitesse, qualité.

Réponds UNIQUEMENT en JSON valide. Jamais de texte autour.`;

function buildAnalyzerPrompt(
  brief: string,
  agentList: string,
  mode: ChainMode,
): string {
  return `Brief : ${brief.slice(0, 300)}

Mode actuel : ${mode}

Agents de la chaîne :
${agentList}

Analyse selon ces 3 axes :

AXE COÛT : agents vraiment inutiles pour ce brief ?
  Ex: Maya si aucune traduction demandée, Camille si pas de contraintes légales

AXE VITESSE : agents indépendants parallélisables ?
  (Sofia et Camille n'ont pas de dépendances communes)

AXE QUALITÉ : agents sous-dimensionnés pour ce brief ?
  Ex: Omar en Haiku pour un brief business complexe → Sonnet recommandé

Format JSON strict :
{
  "suggestions": [
    {
      "id": "unique_id",
      "axis": "cost",
      "description": "Maya non nécessaire — aucune traduction demandée",
      "action": "remove-agent",
      "agentId": "maya",
      "savings": 0.02
    }
  ],
  "recommendedMode": "project"
}

Si aucune suggestion → { "suggestions": [], "recommendedMode": "${mode}" }`;
}

interface AnalyzerResult {
  suggestions: OptimizerSuggestion[];
  recommendedMode?: ChainMode;
}

export function useChainAnalyzer() {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<OptimizerSuggestion[]>([]);
  const [recommendedMode, setRecommendedMode] = useState<ChainMode | null>(null);
  const { apiKey, hasValidApiKey } = useSettingsStore();
  const { agents } = useAgentStore();

  const analyze = useCallback(async (
    brief: string,
    agentIds: string[],
    mode: ChainMode,
  ) => {
    if (!hasValidApiKey() || !brief.trim()) return;
    setAnalyzing(true);
    setSuggestions([]);

    const agentList = agentIds
      .map((id) => {
        const agent = agents.find((a) => a.id === id);
        return agent ? `  ${agent.name} (${agent.role}) — ${agent.model}` : `  ${id}`;
      })
      .join("\n");

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
          model: "claude-haiku-4-5-20251001" as ModelId, // Haiku — rapide + cheap
          systemPrompt: ANALYZER_SYSTEM,
          userMessage: buildAnalyzerPrompt(brief, agentList, mode),
          requestId,
        }).catch(() => resolve());
      };
      setup();
    });

    setAnalyzing(false);

    try {
      const match = fullText.match(/\{[\s\S]*\}/);
      if (!match) return;
      const parsed = JSON.parse(match[0]) as AnalyzerResult;

      // Valider les agentIds des suggestions
      const validAgentIds = new Set(agents.map((a) => a.id));
      const validSuggestions = (parsed.suggestions ?? [])
        .filter((s) => !s.agentId || validAgentIds.has(s.agentId))
        .map((s) => ({ ...s, id: s.id || generateId() }));

      setSuggestions(validSuggestions);
      if (parsed.recommendedMode) setRecommendedMode(parsed.recommendedMode);
    } catch {
      // Réponse invalide — silencieux
    }
  }, [apiKey, hasValidApiKey, agents]);

  const reset = useCallback(() => {
    setSuggestions([]);
    setRecommendedMode(null);
  }, []);

  return { analyze, analyzing, suggestions, recommendedMode, reset };
}
