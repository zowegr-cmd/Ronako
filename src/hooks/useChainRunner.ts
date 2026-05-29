import { useCallback, useRef } from "react";
import { useChainStore } from "@/store/chainStore";
import { useAgentStore } from "@/store/agentStore";
import { useSettingsStore } from "@/store/settingsStore";
import { buildAgentPrompt, mockAgentResponse } from "@/lib/chainEngine";
import { calculateCost, estimateTokens } from "@/lib/tokenCounter";
import { useAnthropicStream } from "./useAnthropicStream";

export function useChainRunner(teamId: string) {
  const abortRef = useRef(false);
  const {
    startRun, setAgentIndex, addMessage, completeRun, stopRun,
    addWorkspaceMessage, setStreaming, appendStreaming, flushStreaming,
    pauseForChef, run,
  } = useChainStore();
  const { getTeamAgents } = useAgentStore();
  const { addSpend, apiKey, hasValidApiKey } = useSettingsStore();
  const { getTeam } = useAgentStore();
  const { stream, abort: abortStream } = useAnthropicStream();

  const runChain = useCallback(
    async (userBrief: string, projectName: string, customAgentIds?: string[], folderContext?: string) => {
      // Si Marcus a sélectionné des agents spécifiques, on les utilise ; sinon toute l'équipe
      const agents = customAgentIds
        ? customAgentIds.map((id) => getTeamAgents(teamId).find((a) => a.id === id) ?? getTeamAgents(teamId).find((a) => a.id === id)).filter(Boolean) as import("@/types").Agent[]
        : getTeamAgents(teamId);
      if (!agents.length) return;

      abortRef.current = false;
      startRun();

      addWorkspaceMessage({ role: "user", content: userBrief });

      let previousOutput = "";
      const useRealApi = hasValidApiKey();
      const team = getTeam(teamId);
      const chefEnabled = team?.enableChefOption ?? false;

      for (let i = 0; i < agents.length; i++) {
        if (abortRef.current) { stopRun(); return; }

        setAgentIndex(i);
        const agent = agents[i];
        const prompt = buildAgentPrompt(agent, { projectName, userBrief, folderContext }, previousOutput, i);

        if (useRealApi) {
          // ── Appel Anthropic réel avec streaming ─────────────────────────
          let inputTokens = estimateTokens(prompt);
          let outputTokens = 0;
          let fullText = "";
          let apiError = "";

          setStreaming(agent.id);

          await new Promise<void>((resolve) => {
            stream({
              apiKey,
              model: agent.model,
              systemPrompt: agent.systemPrompt,
              userMessage: prompt,
              onChunk: (chunk) => {
                appendStreaming(chunk);
                fullText += chunk;
              },
              onDone: (text, inTok, outTok) => {
                fullText = text;
                inputTokens = inTok || estimateTokens(prompt);
                outputTokens = outTok || estimateTokens(text);
                resolve();
              },
              onError: (err) => {
                apiError = err;
                resolve();
              },
            });
          });

          if (abortRef.current) { flushStreaming(); stopRun(); return; }

          flushStreaming();

          if (apiError) {
            // Afficher l'erreur dans le chat et arrêter la chaîne
            addWorkspaceMessage({
              role: "system",
              content: `Erreur API (${agent.name}) : ${apiError}`,
              agentId: agent.id,
            });
            stopRun();
            return;
          }

          const cost = calculateCost(agent.model, inputTokens, outputTokens);
          addMessage({
            role: "assistant",
            content: fullText,
            agentId: agent.id,
            tokens: inputTokens + outputTokens,
            cost,
          });
          addSpend(cost);
          previousOutput = fullText;

        } else {
          // ── Fallback mock (aucune clé API) ────────────────────────────
          await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
          if (abortRef.current) { stopRun(); return; }

          const result = mockAgentResponse(agent, prompt);
          previousOutput = result.content;

          addMessage({
            role: "assistant",
            content: result.content,
            agentId: agent.id,
            tokens: result.inputTokens + result.outputTokens,
            cost: result.cost,
          });
          addWorkspaceMessage({
            role: "assistant",
            content: result.content,
            agentId: agent.id,
            tokens: result.inputTokens + result.outputTokens,
            cost: result.cost,
          });
          addSpend(result.cost);
        }
      }

      // ── Option Chef : pause avant livraison finale ────────────────────
      if (chefEnabled && !abortRef.current) {
        pauseForChef();
        addWorkspaceMessage({
          role: "system",
          content: "⏸ **Option Chef** — La chaîne est en pause. Consultez les livrables et validez la livraison.",
        });
        // On attend que l'utilisateur clique "Valider"
        await new Promise<void>((resolve) => {
          const unsub = useChainStore.subscribe((s) => {
            if (s.run.status === "running" || s.run.status === "completed") {
              unsub();
              resolve();
            }
          });
        });
        if (abortRef.current) { stopRun(); return; }
      }

      completeRun();
    },
    [
      teamId, apiKey, hasValidApiKey, getTeamAgents, getTeam,
      startRun, setAgentIndex, addMessage, completeRun, stopRun, pauseForChef,
      addWorkspaceMessage, setStreaming, appendStreaming, flushStreaming,
      addSpend, stream, run,
    ]
  );

  const stop = useCallback(() => {
    abortRef.current = true;
    abortStream();
    stopRun();
  }, [stopRun, abortStream]);

  return { runChain, stop, isRunning: run.status === "running" };
}
