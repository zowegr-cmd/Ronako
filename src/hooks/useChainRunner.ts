import { useCallback, useRef } from "react";
import { useChainStore } from "@/store/chainStore";
import { useAgentStore } from "@/store/agentStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useToastStore } from "@/store/toastStore";
import { useProjectStore } from "@/store/projectStore";
import { buildAgentPrompt, buildRelayPrompt, mockAgentResponse, buildToolDefinitions, type ToolKeys } from "@/lib/chainEngine";
import { calculateCost, estimateTokens } from "@/lib/tokenCounter";
import { estimateRelaySavings, DNA_SYSTEM_PROMPT } from "@/lib/projectDNA";
import { buildDependencyContext } from "@/lib/dependencyMatrix";
import { MARCUS_CHECK_PROMPT, buildMarcusCheckInput, parseMarcusCheckResponse, applyMarcusCorrection } from "@/lib/marcusCheck";
import { CHAIN_MODES, resolveAgentModel } from "@/lib/chainModes";

function formatCentsForNotif(cents: number): string {
  return cents < 1 ? "<0.01€" : `${(cents / 100).toFixed(2)}€`;
}
import { parseRyoOutput } from "@/lib/ryoParser";
import { updateMemoryAfterChain } from "@/lib/userMemory";
import { getCachedAnalysis, cacheAnalysis, formatCacheSavings } from "@/lib/analysisCache";
import { recordChain } from "@/lib/sessionTracker";
import { saveDeliverable } from "@/lib/libraryManager";
import { sendNotification, isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { useAnthropicStream } from "./useAnthropicStream";
import { useSounds } from "./useSounds";
import { RELAY_AGENT } from "@/lib/agents/defaultTeam";
import { tavilySearch, formatTavilyForPrompt } from "@/lib/connectors/tavily";
import type { Agent } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { generateId } from "@/lib/utils";
import { useConnectorStore } from "@/store/connectorStore";

export function useChainRunner(teamId: string) {
  const abortRef = useRef(false);
  const {
    startRun, setAgentIndex, addMessage, completeRun, stopRun,
    addWorkspaceMessage, setStreaming, appendStreaming, flushStreaming,
    pauseForChef, pauseForAgent, setProjectDNA, setRelayActive, addRelaySavings,
    setRelayOutput, clearRelayOutputs, projectDNA, relayOutputs, chainMode,
    setRyoResult, setRealCost, setChainStartTime, setDeliverablePath,
    setLastDeliverableContent,
  } = useChainStore();
  const { getTeamAgents, getTeam, getActiveSkillsForAgent, skills } = useAgentStore();
  const { addSpend, apiKey, hasValidApiKey, monthlySpend, monthlyBudgetCap, connectorKeys, deliverableLanguage } = useSettingsStore();
  const { getKey: getConnectorKey } = useConnectorStore();
  const toast = useToastStore();
  const { stream, abort: abortStream } = useAnthropicStream();
  const { playChainStart, playChime } = useSounds();

  // ── Appel API générique ───────────────────────────────────────────
  const runApiCall = useCallback(async (
    systemPrompt: string,
    userMessage: string,
    modelId: string,
    onChunk?: (c: string) => void,
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> => {
    return new Promise((resolve) => {
      let text = "";
      stream({
        apiKey,
        model: modelId as import("@/types").ModelId,
        systemPrompt,
        userMessage,
        onChunk: (c) => { text += c; onChunk?.(c); },
        onDone: (full, inTok, outTok) => {
          resolve({ text: full || text, inputTokens: inTok, outputTokens: outTok });
        },
        onError: (err) => resolve({ text: `ERROR:${err}`, inputTokens: 0, outputTokens: 0 }),
      });
    });
  }, [stream, apiKey]);

  // ── Générer l'ADN Projet ──────────────────────────────────────────
  const generateProjectDNA = useCallback(async (userBrief: string): Promise<string> => {
    if (!hasValidApiKey()) return "";
    try {
      const result = await runApiCall(DNA_SYSTEM_PROMPT, userBrief, RELAY_AGENT.model);
      return result.text.startsWith("ERROR:") ? "" : result.text;
    } catch { return ""; }
  }, [hasValidApiKey, runApiCall]);

  // ── Relay : distille le contexte pour le prochain agent ──────────
  // Utilise la matrice de dépendances pour construire le contexte multi-sources
  const runRelay = useCallback(async (
    currentAgentOutput: string,
    currentAgent: Agent,
    nextAgent: Agent,
    currentRelayOutputs: Record<string, string>,
    _dna: string, // réservé pour Marcus Check Phase 1.4
  ): Promise<string> => {
    if (!hasValidApiKey()) return currentAgentOutput;

    // Stocker le résumé Relay de cet agent (pour les futures dépendances)
    // D'abord on distille l'output courant → summary
    const singleRelayResult = await runApiCall(
      RELAY_AGENT.systemPrompt,
      buildRelayPrompt(currentAgentOutput, nextAgent, currentAgent),
      RELAY_AGENT.model,
    );

    if (singleRelayResult.text.startsWith("ERROR:")) return currentAgentOutput;

    const summary = singleRelayResult.text;

    // Stocker ce résumé dans le store pour les agents futurs (matrice)
    setRelayOutput(currentAgent.id, summary);
    const { savedTokens } = estimateRelaySavings(
      estimateTokens(currentAgentOutput),
      singleRelayResult.outputTokens,
    );
    addRelaySavings(savedTokens);

    // Construire le contexte dépendances pour le prochain agent
    const updatedOutputs = { ...currentRelayOutputs, [currentAgent.id]: summary };
    const depContext = buildDependencyContext(nextAgent.id, updatedOutputs, currentAgent.id);

    if (!depContext || depContext === summary) {
      // Pas de dépendances supplémentaires → utiliser le résumé direct
      return summary;
    }

    // Dépendances multiples → re-distiller en un seul résumé ciblé
    const multiRelayResult = await runApiCall(
      RELAY_AGENT.systemPrompt,
      buildRelayPrompt(depContext, nextAgent),
      RELAY_AGENT.model,
    );

    if (multiRelayResult.text.startsWith("ERROR:")) return summary;
    addRelaySavings(Math.max(0, estimateTokens(depContext) - multiRelayResult.outputTokens));
    return multiRelayResult.text;
  }, [hasValidApiKey, runApiCall, setRelayOutput, addRelaySavings]);

  // ── Marcus Check : vérification cohérence silencieuse ────────────
  const runMarcusCheck = useCallback(async (
    dna: string,
    relayContext: string,
  ): Promise<string> => {
    if (!hasValidApiKey() || !dna || !relayContext) return relayContext;
    try {
      const result = await runApiCall(
        MARCUS_CHECK_PROMPT,
        buildMarcusCheckInput(dna, relayContext),
        RELAY_AGENT.model, // Sonnet — rapide et précis
      );
      const check = parseMarcusCheckResponse(result.text);
      if (!check.ok && check.correction) {
        return applyMarcusCorrection(relayContext, check.correction);
      }
    } catch { /* silencieux */ }
    return relayContext;
  }, [hasValidApiKey, runApiCall]);

  const runChain = useCallback(
    async (
      userBrief: string,
      projectName: string,
      customAgentIds?: string[],
      folderContext?: string,
    ) => {
      // ── Résoudre la liste d'agents ───────────────────────────────
      // Les agents viennent toujours de la proposition (customAgentIds) ou de l'équipe.
      // Le mode ne force JAMAIS les agents — il change seulement les modèles et l'infra.
      const allTeamAgents = getTeamAgents(teamId);
      const modeConfig = CHAIN_MODES[chainMode];
      const baseAgentIds = customAgentIds ?? allTeamAgents.map((a) => a.id);
      const agents = baseAgentIds
        .map((id) => allTeamAgents.find((a) => a.id === id))
        .filter(Boolean) as Agent[];

      // Appliquer les overrides de modèle selon le mode
      const agentsWithMode: Agent[] = agents.map((a) => ({
        ...a,
        model: resolveAgentModel(a.id, a.model, modeConfig.modelOverride),
      }));

      if (!agentsWithMode.length) return;

      abortRef.current = false;
      startRun();
      clearRelayOutputs();
      setChainStartTime(Date.now());
      playChainStart();

      addWorkspaceMessage({ role: "user", content: userBrief });

      const useRealApi = hasValidApiKey();
      const team = getTeam(teamId);
      const chefEnabled = team?.enableChefOption ?? false;

      // Paramètres du mode
      const relayEnabled = modeConfig.relayActive;
      const marcusCheckEnabled = modeConfig.marcusCheckActive;

      // ── Étape 0 : ADN Projet ──────────────────────────────────────
      let dna = projectDNA;
      if (!dna && useRealApi) {
        addWorkspaceMessage({
          role: "system",
          content: "🧬 Génération de l'ADN Projet (contexte partagé par tous les agents)…",
        });
        dna = await generateProjectDNA(userBrief);
        if (dna) setProjectDNA(dna);
      }

      let previousOutput = "";
      let relayContext: string | undefined;
      let currentRelayOutputs: Record<string, string> = { ...relayOutputs };

      for (let i = 0; i < agentsWithMode.length; i++) {
        if (abortRef.current) { stopRun(); return; }

        // ── Budget cap ────────────────────────────────────────────
        if (monthlySpend >= monthlyBudgetCap) {
          toast.error("Budget épuisé", `Limite mensuelle atteinte.`);
          stopRun(); return;
        }
        if (i === 0 && monthlySpend >= monthlyBudgetCap * 0.8) {
          toast.warning("Budget à 80%", `${(monthlySpend / 100).toFixed(2)} € ce mois.`);
        }

        setAgentIndex(i);
        const agent = agentsWithMode[i];

        // ── Web Search Tavily ─────────────────────────────────────
        let searchContext: string | undefined;
        const hasTavily = agent.tools.includes("web_search") &&
          (!agent.connectors?.length || agent.connectors.includes("tavily")) &&
          connectorKeys.tavily;
        if (hasTavily && connectorKeys.tavily) {
          try {
            addWorkspaceMessage({ role: "system", content: `🔍 ${agent.name} effectue une recherche web…`, agentId: agent.id });
            const results = await tavilySearch(`${agent.role}: ${userBrief.slice(0, 300)}`, connectorKeys.tavily);
            searchContext = formatTavilyForPrompt(results);
          } catch { /* silencieux */ }
        }

        // ── Construire le prompt ──────────────────────────────────
        const combinedFolderContext = [folderContext, searchContext].filter(Boolean).join("\n\n") || undefined;
        // Collecter les skills actifs pour cet agent + universels Marcus
        const agentSkills = getActiveSkillsForAgent(agent.id);
        const universalSkills = skills.filter((s) => s.isActive && s.agentIds.includes("marcus") && s.inheritToAll);

        const prompt = buildAgentPrompt(
          agent,
          {
            projectName, userBrief, folderContext: combinedFolderContext,
            projectDNA: dna ?? undefined, relayContext,
            agentSkills, universalSkills,
            deliverableLanguage,
          },
          previousOutput,
          i,
        );

        if (useRealApi) {
          // ── Vérifier le cache (6.11) ─────────────────────────────
          const cached = await getCachedAnalysis(agent.id, userBrief);
          if (cached) {
            toast.info(formatCacheSavings(cached), "");
            addMessage({ role: "assistant", content: cached.output, agentId: agent.id, tokens: estimateTokens(cached.output), cost: 0 });
            addWorkspaceMessage({ role: "system", content: `💾 ${agent.name} — résultat mis en cache réutilisé`, agentId: agent.id });
            previousOutput = cached.output;
            continue;
          }

          // ── Phase 8 — Tool Use : router vers la bonne commande ───
          const agentConnectorIds = agent.connectors ?? [];
          // Merge : connectorStore (nouvelle source) + settingsStore (backwards compat)
          const toolKeyMap: ToolKeys = {
            openai:  getConnectorKey("openai")  || connectorKeys.openai,
            bfl:     getConnectorKey("bfl")     || connectorKeys.bfl,
            e2b:     getConnectorKey("e2b")     || connectorKeys.e2b,
            notion:  getConnectorKey("notion")  || connectorKeys.notion,
            github:  getConnectorKey("github")  || connectorKeys.github,
            tavily:  getConnectorKey("tavily")  || connectorKeys.tavily,
          };
          const agentTools = buildToolDefinitions(agentConnectorIds, toolKeyMap);
          const useToolsApi = agentTools.length > 0;

          let inputTokens = estimateTokens(prompt);
          let outputTokens = 0;
          let fullText = "";
          let apiError = "";
          const MAX_RETRIES = 2;

          // ── Retry wrapper (2.9) ─────────────────────────────────
          for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            fullText = "";
            apiError = "";

            setStreaming(agent.id);

            if (useToolsApi) {
              // ── Tool Use : invoke Rust directement ───────────────
              const reqId = generateId();
              const unlisteners: Array<() => void> = [];

              await new Promise<void>((resolve) => {
                const setup = async () => {
                  const unChunk = await listen<string>(`anthropic-chunk-${reqId}`, (ev) => {
                    appendStreaming(ev.payload); fullText += ev.payload;
                  });
                  const unDone = await listen<{ input_tokens: number; output_tokens: number }>(`anthropic-done-${reqId}`, (ev) => {
                    inputTokens = ev.payload.input_tokens || estimateTokens(prompt);
                    outputTokens = ev.payload.output_tokens || estimateTokens(fullText);
                    unlisteners.forEach((fn) => fn());
                    resolve();
                  });
                  const unErr = await listen<string>(`anthropic-error-${reqId}`, (ev) => {
                    apiError = ev.payload;
                    unlisteners.forEach((fn) => fn());
                    resolve();
                  });
                  // Tool use events → ajouter message système dans le chat
                  const unToolUse = await listen<{ tool_name: string; tool_use_id: string; input: unknown }>(`anthropic-tool-use-${reqId}`, (ev) => {
                    const { tool_name } = ev.payload;
                    const label = tool_name === "generate_image_dalle" ? "🎨 DALL-E génère une image…"
                      : tool_name === "generate_image_flux" ? "🎨 Flux génère une image…"
                      : tool_name === "execute_code" ? "⚙️ E2B exécute le code…"
                      : tool_name === "web_search" ? "🔍 Recherche web…"
                      : tool_name === "export_to_notion" ? "📓 Export Notion…"
                      : tool_name === "github_push" ? "🐙 Push GitHub…"
                      : `⚙️ ${tool_name}…`;
                    addWorkspaceMessage({ role: "system", content: label, agentId: agent.id });
                  });
                  const unToolResult = await listen<{ tool_name: string; result: string; is_error: boolean; metadata?: unknown }>(`anthropic-tool-result-${reqId}`, (ev) => {
                    const { tool_name, is_error, metadata } = ev.payload;
                    // Dispatch event pour DeliverablePanel
                    document.dispatchEvent(new CustomEvent("tool-result", { detail: { tool_name, is_error, metadata } }));
                  });
                  unlisteners.push(unChunk, unDone, unErr, unToolUse, unToolResult);

                  invoke("anthropic_stream_with_tools", {
                    apiKey, model: agent.model,
                    systemPrompt: agent.systemPrompt,
                    userMessage: prompt,
                    requestId: reqId,
                    tools: agentTools,
                    toolKeys: toolKeyMap,
                  }).catch((e) => { apiError = String(e); unlisteners.forEach((fn) => fn()); resolve(); });
                };
                setup();
              });
            } else {
              // ── Streaming texte pur (existant) ───────────────────
              await new Promise<void>((resolve) => {
                stream({
                  apiKey,
                  model: agent.model,
                  systemPrompt: agent.systemPrompt,
                  userMessage: prompt,
                  onChunk: (chunk) => { appendStreaming(chunk); fullText += chunk; },
                  onDone: (text, inTok, outTok) => {
                    fullText = text;
                    inputTokens = inTok || estimateTokens(prompt);
                    outputTokens = outTok || estimateTokens(text);
                    resolve();
                  },
                  onError: (err) => { apiError = err; resolve(); },
                });
              });
            }

            // Output valide (>50 chars et pas d'erreur) → sortir de la boucle
            if (!apiError && fullText.length > 50) break;

            if (attempt < MAX_RETRIES) {
              flushStreaming();
              toast.warning(`Retry ${attempt + 1}/${MAX_RETRIES}`, `${agent.name} relancé…`);
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
              if (abortRef.current) { stopRun(); return; }
            } else {
              // Tous retries épuisés → fallback texte
              if (apiError) {
                fullText = `[${agent.name} n'a pas pu produire de résultat après ${MAX_RETRIES + 1} tentatives. La chaîne continue.]`;
              }
            }
          }

          if (abortRef.current) { flushStreaming(); stopRun(); return; }
          flushStreaming();

          if (apiError && fullText.length < 50) {
            // Mode dégradé (6.12) : continuer avec un placeholder au lieu d'arrêter
            const fallback = `[${agent.name} n'a pas pu produire de résultat après ${MAX_RETRIES + 1} tentatives.\nRaison : ${apiError}\nLa chaîne continue sans cette contribution. Tu peux relancer ${agent.name} seul depuis Bibliothèque → Retravailler.]`;
            addMessage({ role: "assistant", content: fallback, agentId: agent.id, tokens: 0, cost: 0 });
            addWorkspaceMessage({ role: "system", content: `⚠️ ${agent.name} en échec — chaîne continue en mode dégradé`, agentId: agent.id });
            toast.warning(`${agent.name} indisponible`, "Chaîne continue en mode dégradé");
            previousOutput = fallback;
            continue; // ← ne pas arrêter la chaîne
          }

          const cost = calculateCost(agent.model, inputTokens, outputTokens);
          addMessage({ role: "assistant", content: fullText, agentId: agent.id, tokens: inputTokens + outputTokens, cost });
          addSpend(cost);
          setRealCost(useChainStore.getState().run.totalCost + cost);
          previousOutput = fullText;

          // Mettre en cache pour les prochaines fois (6.11)
          void cacheAnalysis(agent.id, userBrief, fullText, cost);

          // Extraire le score Ryo si c'est l'agent Ryo
          if (agent.id === "ryo" && fullText) {
            const ryoData = parseRyoOutput(fullText);
            if (ryoData.score > 0) setRyoResult(ryoData);
          }

          // ── Vérifier pause après agent (2.7) ────────────────────
          if (useChainStore.getState().run.status === "pausing") {
            const remaining = agentsWithMode.length - 1 - i;
            stopRun();
            toast.info(
              "Chaîne mise en pause",
              remaining > 0 ? `${remaining} agent${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}` : "Tous les agents ont terminé",
            );
            return;
          }

          // ── Relay + Marcus Check pour le prochain agent ─────────
          if (relayEnabled && i < agentsWithMode.length - 1 && !abortRef.current) {
            const nextAgent = agentsWithMode[i + 1];
            setRelayActive(true, nextAgent.id);

            // Relay distille le contexte (via matrice dépendances)
            let newRelayContext = await runRelay(
              fullText, agent, nextAgent, currentRelayOutputs, dna ?? "",
            );

            // Mettre à jour les relayOutputs locaux
            currentRelayOutputs = { ...currentRelayOutputs, [agent.id]: newRelayContext };

            // Marcus Check — silencieux si activé dans le mode
            if (marcusCheckEnabled && dna && newRelayContext) {
              newRelayContext = await runMarcusCheck(dna, newRelayContext);
            }

            relayContext = newRelayContext;
            setRelayActive(false, null);
          }

        } else {
          // ── Mode mock (sans clé API) ──────────────────────────
          await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
          if (abortRef.current) { stopRun(); return; }

          const result = mockAgentResponse(agent, prompt);
          previousOutput = result.content;
          relayContext = undefined;
          currentRelayOutputs[agent.id] = result.content.slice(0, 200);

          addMessage({ role: "assistant", content: result.content, agentId: agent.id, tokens: result.inputTokens + result.outputTokens, cost: result.cost });
          addWorkspaceMessage({ role: "assistant", content: result.content, agentId: agent.id, tokens: result.inputTokens + result.outputTokens, cost: result.cost });
          addSpend(result.cost);
        }

        // ── Pause after agent (7.3) ───────────────────────────────
        if (agent.pauseAfter && !abortRef.current) {
          pauseForAgent(agent.id, agent.pauseMessage);
          addWorkspaceMessage({
            role: "system",
            content: `⏸ **Pause** — ${agent.pauseMessage || `${agent.name} a terminé. Lisez l'output puis continuez.`}`,
          });
          await new Promise<void>((resolve) => {
            const unsub = useChainStore.subscribe((s) => {
              if (s.run.status === "running" || s.run.status === "completed" || s.run.status === "idle") {
                unsub(); resolve();
              }
            });
          });
          if (abortRef.current || useChainStore.getState().run.status === "idle") { stopRun(); return; }
        }
      }

      // ── Option Chef ───────────────────────────────────────────────
      if (chefEnabled && !abortRef.current) {
        pauseForChef();
        addWorkspaceMessage({ role: "system", content: "⏸ **Option Chef** — Chaîne en pause. Consultez les livrables et validez." });
        await new Promise<void>((resolve) => {
          const unsub = useChainStore.subscribe((s) => {
            if (s.run.status === "running" || s.run.status === "completed") { unsub(); resolve(); }
          });
        });
        if (abortRef.current) { stopRun(); return; }
      }

      completeRun();
      playChime();

      // Enregistrer la session (6.14)
      const finalState = useChainStore.getState();
      void recordChain(finalState.realCost || finalState.run.totalCost, finalState.ryoResult?.score ?? 0);

      // ── Notification OS (2.8) ─────────────────────────────────
      try {
        let granted = await isPermissionGranted();
        if (!granted) {
          const perm = await requestPermission();
          granted = perm === "granted";
        }
        if (granted) {
          const state = useChainStore.getState();
          const score = state.ryoResult?.score ?? 0;
          const cost  = formatCentsForNotif(state.realCost || state.run.totalCost);
          const modeLabel = CHAIN_MODES[state.chainMode]?.label ?? "Projet";
          sendNotification({
            title: "Ronako — Chaîne terminée ✓",
            body: [
              score > 0 ? `Score ${score}/10` : null,
              cost,
              modeLabel,
              "Voir le livrable dans l'app",
            ].filter(Boolean).join(" · "),
          });
        }
      } catch { /* notification refusée — fallback toast déjà affiché */ }

      // ── Sauvegarde automatique silencieuse ────────────────────
      try {
        const state = useChainStore.getState();
        const project = useProjectStore.getState().getActiveProject();
        const duration = state.chainStartTime ? Math.round((Date.now() - state.chainStartTime) / 1000) : 0;
        const outputs: Record<string, string> = {};
        for (const msg of state.run.messages) {
          if (msg.agentId && msg.role === "assistant") outputs[msg.agentId] = msg.content;
        }
        const finalDeliverable = outputs["sam"] ?? outputs["ella"] ?? Object.values(outputs).at(-1) ?? "";
        if (finalDeliverable) setLastDeliverableContent(finalDeliverable);
        const path = await saveDeliverable({
          projectPath: project?.path ?? null,
          projectId: project?.id ?? "unknown",
          brief: userBrief,
          dna: state.projectDNA ?? "",
          mode: state.chainMode,
          agents: agentsWithMode.map((a) => a.id),
          outputs,
          relayOutputs: state.relayOutputs,
          finalDeliverable,
          score: state.ryoResult?.score ?? 0,
          realCost: state.realCost || state.run.totalCost,
          duration,
        });
        setDeliverablePath(path);
        toast.info("Sauvegardé", "Livrable enregistré dans la bibliothèque");

        // ── Mise à jour mémoire utilisateur (2.12) ────────────────
        const ryoScore = useChainStore.getState().ryoResult?.score ?? 0;
        await updateMemoryAfterChain({
          mode: chainMode,
          score: ryoScore,
          costCents: useChainStore.getState().realCost || useChainStore.getState().run.totalCost,
          agentsUsed: agentsWithMode.map((a) => a.id),
        });

        // ── Marcus propose de sauvegarder l'équipe si score ≥ 8 (2.13) ─
        if (ryoScore >= 8 && customAgentIds && customAgentIds.length > 2) {
          useChainStore.getState().addWorkspaceMessage({
            role: "system",
            content: `⭐ Score ${ryoScore}/10 — Excellent résultat ! Tu veux sauvegarder cette configuration d'équipe pour la réutiliser ?`,
          });
          // Déclencher l'event pour que l'Orchestrator propose la sauvegarde
          document.dispatchEvent(new CustomEvent("suggest-save-team", {
            detail: { agentIds: customAgentIds, score: ryoScore },
          }));
        }
      } catch { /* sauvegarde silencieuse — jamais de crash */ }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teamId, apiKey, hasValidApiKey, monthlySpend, monthlyBudgetCap, connectorKeys, projectDNA, relayOutputs, chainMode,
     getTeamAgents, getTeam, startRun, setAgentIndex, addMessage, completeRun, stopRun, pauseForChef, pauseForAgent,
     addWorkspaceMessage, setStreaming, appendStreaming, flushStreaming, addSpend, stream,
     playChainStart, playChime, toast, generateProjectDNA, runRelay, runMarcusCheck,
     setProjectDNA, setRelayActive, clearRelayOutputs],
  );

  const stop = useCallback(() => {
    abortRef.current = true;
    abortStream();
    stopRun();
    setRelayActive(false, null);
  }, [stopRun, abortStream, setRelayActive]);

  return { runChain, stop };
}
