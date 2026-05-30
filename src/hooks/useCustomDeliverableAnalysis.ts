import { useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { generateId } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";
import { MODEL_TIERS } from "@/types";
import type { CustomDeliverableInsight } from "@/lib/customDeliverableAnalyzer";

interface AnalysisContext {
  brief: string;
  availableSkills: Array<{ id: string; name: string; agentIds: string[] }>;
  configuredConnectors: string[];
}

const SYSTEM_PROMPT = `Tu es Marcus, Chef d'Orchestre. L'utilisateur veut un livrable spécifique.
Analyse et retourne UNIQUEMENT ce JSON (sans texte autour) :
{
  "tip": "Conseil en français (2-3 phrases). Structure : ✅ Meilleure solution d'abord — si un connecteur donne le vrai format demandé (vrai .xlsx, vrai .pptx, vraie image), mets-le en premier. Puis 💡 alternative sans connecteur. Sois direct : si le connecteur est clairement supérieur, ne bury pas cette info.",
  "suggestedSkills": ["skill-id-si-pertinent"],
  "suggestedConnectors": ["connector-id-si-meilleur-résultat"],
  "agentHint": "id-agent-le-plus-adapté",
  "blocking": false
}
Règle : priorité au meilleur résultat pour l'utilisateur. Un connecteur payant qui donne le vrai format > une solution gratuite approximative. Mentionne toujours les deux. Ne bloque jamais.`;

function buildUserMessage(text: string, ctx: AnalysisContext): string {
  const skillList = ctx.availableSkills.length > 0
    ? ctx.availableSkills.map((s) => `- ${s.id}: ${s.name} (${s.agentIds.join(",")})`).join("\n")
    : "Aucun skill installé";
  const connectorList = ctx.configuredConnectors.length > 0
    ? ctx.configuredConnectors.join(", ")
    : "Aucun connecteur configuré";

  return `Livrable demandé : "${text}"

Contexte projet (brief résumé) : ${ctx.brief.slice(0, 300)}

Skills disponibles :
${skillList}

Connecteurs configurés : ${connectorList}

Analyse ce livrable et retourne le JSON.`;
}

export function useCustomDeliverableAnalysis(ctx: AnalysisContext) {
  const { apiKey, hasValidApiKey } = useSettingsStore();
  const [insight, setInsight] = useState<CustomDeliverableInsight | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const abortRef = useRef<boolean>(false);

  const analyze = async (text: string) => {
    if (!hasValidApiKey() || !text.trim()) return;
    abortRef.current = false;
    setAnalyzing(true);
    setInsight(null);

    const requestId = generateId();
    let fullText = "";

    await new Promise<void>((resolve) => {
      const unlisteners: Array<() => void> = [];

      const setup = async () => {
        const unChunk = await listen<string>(`anthropic-chunk-${requestId}`, (ev) => {
          if (!abortRef.current) fullText += ev.payload;
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
          model: MODEL_TIERS.fast, // Haiku 4.5 — le moins cher
          systemPrompt: SYSTEM_PROMPT,
          userMessage: buildUserMessage(text, ctx),
          requestId,
        }).catch(() => resolve());
      };

      setup();
    });

    if (abortRef.current) { setAnalyzing(false); return; }

    try {
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          tip?: string;
          suggestedSkills?: string[];
          suggestedConnectors?: string[];
          agentHint?: string;
          blocking?: boolean;
        };
        setInsight({
          message: parsed.tip ?? "Marcus a analysé ce livrable.",
          blocking: parsed.blocking ?? false,
          skillIds: parsed.suggestedSkills?.filter(Boolean),
          connectorIds: parsed.suggestedConnectors?.filter(Boolean),
          agentHint: parsed.agentHint ?? undefined,
        });
      }
    } catch { /* silencieux si JSON invalide */ }

    setAnalyzing(false);
  };

  const abort = () => { abortRef.current = true; setAnalyzing(false); };
  const clear = () => setInsight(null);

  return { insight, analyzing, analyze, abort, clear };
}
