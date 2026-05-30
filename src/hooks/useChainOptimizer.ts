import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { generateId } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";
import { MODEL_TIERS } from "@/types";
import type { ProposedAgent, ChainProposal } from "@/types";

// ── Règles d'agents indispensables ───────────────────────────────────────────

export function enforceIndispensable(
  agents: ProposedAgent[],
  allAgentIds: Set<string>,
): { result: ProposedAgent[]; added: string[] } {
  const result = [...agents];
  const ids = new Set(result.map((a) => a.id));
  const added: string[] = [];

  // Marcus toujours en premier (Chef d'Orchestre)
  if (!ids.has("marcus") && allAgentIds.has("marcus")) {
    result.unshift({ id: "marcus", reason: "Chef d'Orchestre — toujours indispensable" });
    added.push("marcus");
  }

  // Ella (Fusion) si 3+ agents produisant du contenu et pas déjà incluse
  const contentAgents = ["leo", "sofia", "omar", "axel", "maya", "camille", "nina", "tom"];
  const contentCount = result.filter((a) => contentAgents.includes(a.id)).length;
  if (contentCount >= 3 && !ids.has("ella") && allAgentIds.has("ella")) {
    const samIdx = result.findIndex((a) => a.id === "sam");
    const insertAt = samIdx >= 0 ? samIdx : result.length;
    result.splice(insertAt, 0, { id: "ella", reason: "Fusion — consolide les outputs multiples" });
    added.push("ella");
  }

  // Sam (Scribe) comme dernier agent si la chaîne fait >2 agents
  if (result.length > 2 && !ids.has("sam") && allAgentIds.has("sam")) {
    result.push({ id: "sam", reason: "Scribe — note technique finale pour Claude Code" });
    added.push("sam");
  }

  return { result, added };
}

// ── Prompt d'optimisation de chaîne ──────────────────────────────────────────

const OPTIMIZER_PROMPT = (
  agentList: string,
  available: string,
  brief: string,
) => `Tu es un expert en orchestration d'agents IA. Optimise cette chaîne d'agents.

Brief du projet :
${brief}

Chaîne actuelle (dans l'ordre) :
${agentList}

Agents disponibles non inclus :
${available}

Règles absolues :
1. Marcus DOIT être le premier (Chef d'Orchestre)
2. Sam (Scribe) DOIT être le dernier si une note technique est utile
3. Ella (Fusion) est nécessaire si 3+ agents produisent du contenu différent
4. Ryo (Validation) doit précéder Ella ou Sam si la qualité est critique
5. Ordre logique : stratégie/analyse → contenu/design → technique → qualité → fusion → scribe

Identifie les agents manquants critiques, supprime les redondants, réordonne logiquement.

Réponds UNIQUEMENT avec ce JSON (sans texte autour) :
{
  "changes": "Explication concise des changements (1-2 phrases)",
  "agents": [{"id": "agent_id", "reason": "Raison courte"}]
}`;

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useChainOptimizer() {
  const [optimizing, setOptimizing] = useState(false);
  const { apiKey, hasValidApiKey } = useSettingsStore();
  const { agents } = useAgentStore();

  const optimize = useCallback(
    async (
      current: ProposedAgent[],
      brief: string,
    ): Promise<{ proposal: ChainProposal; changes: string } | null> => {
      if (!hasValidApiKey()) return null;
      setOptimizing(true);

      const marcus = agents.find((a) => a.id === "marcus") ?? agents[0];
      const requestId = generateId();

      const agentList = current
        .map((a, i) => {
          const def = agents.find((ag) => ag.id === a.id);
          return `${i + 1}. ${def?.name ?? a.id} (${def?.role ?? ""}) — ${a.reason}`;
        })
        .join("\n");

      const currentIds = new Set(current.map((a) => a.id));
      const available = agents
        .filter((a) => !a.isSystem && !currentIds.has(a.id))
        .map((a) => `  ${a.id} → ${a.role}`)
        .join("\n");

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
            systemPrompt: "Tu es un expert en orchestration d'agents IA. Réponds uniquement en JSON valide.",
            userMessage: OPTIMIZER_PROMPT(agentList, available, brief),
            requestId,
          }).catch(() => resolve());
        };
        setup();
      });

      setOptimizing(false);

      try {
        const match = fullText.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("Pas de JSON");
        const parsed = JSON.parse(match[0]) as {
          changes: string;
          agents: ProposedAgent[];
        };
        const validIds = new Set(agents.map((a) => a.id));
        const validAgents = parsed.agents.filter((a) => validIds.has(a.id));
        return { proposal: { brief, agents: validAgents }, changes: parsed.changes };
      } catch {
        return null;
      }
    },
    [apiKey, hasValidApiKey, agents],
  );

  return { optimize, optimizing };
}
