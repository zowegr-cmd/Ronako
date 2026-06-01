/**
 * Hook de conversation 1-on-1 avec un agent.
 * Gère le streaming, le tool use (E2B, DALL-E, Tavily...) et les fichiers générés.
 */
import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";
import { useConnectorStore } from "@/store/connectorStore";
import { useAgentChatStore } from "@/store/agentChatStore";
import { useAnthropicStream } from "./useAnthropicStream";
import { generateId } from "@/lib/utils";
import {
  buildToolDefinitions,
  buildPromptWithSkills,
  type ToolKeys,
} from "@/lib/chainEngine";

const CONNECTOR_LABELS: Record<string, string> = {
  openai: "DALL-E 3 (images)", bfl: "Flux (images rapides)",
  e2b: "E2B (exécution code, génère fichiers)", notion: "Notion (export pages)",
  github: "GitHub (commits/PRs)", tavily: "Tavily (recherche web)",
  serper: "Google Search", perplexity: "Perplexity (recherche)",
  groq: "Groq (LLM ultra-rapide)",
};

export function useAgentChat() {
  const { stream } = useAnthropicStream();
  const { apiKey, hasValidApiKey, deliverableLanguage, connectorKeys } = useSettingsStore();
  const { getAgent, getActiveSkillsForAgent, skills } = useAgentStore();
  const { keys: allConnectorKeys, customConnectors, mcpStates } = useConnectorStore();
  const {
    activeAgentId,
    addMessage,
    setStreaming,
    appendStreaming,
    flushStreaming,
    addGeneratedFile,
    getMessages,
  } = useAgentChatStore();

  const sendMessage = useCallback(
    async (userText: string) => {
      const agentId = activeAgentId;
      const agent = getAgent(agentId);
      if (!agent) return;

      if (!hasValidApiKey()) {
        addMessage(agentId, {
          role: "assistant",
          agentId,
          content: "Configure ta clé API Anthropic dans les **Paramètres** pour commencer.",
        });
        return;
      }

      // Ajouter le message utilisateur
      addMessage(agentId, { role: "user", content: userText });

      // Historique de conversation (20 derniers messages)
      const history = getMessages(agentId).slice(-20);
      const historyText = history
        .map((m) =>
          m.role === "user"
            ? `Utilisateur: ${m.content}`
            : `${agent.name}: ${m.content}`
        )
        .join("\n\n");
      const fullUserMessage = historyText
        ? `${historyText}\n\nUtilisateur: ${userText}`
        : userText;

      // System prompt enrichi avec skills
      const agentSkills = getActiveSkillsForAgent(agentId);
      const universalSkills = skills.filter(
        (s) => s.isActive && s.agentIds.includes("marcus") && s.inheritToAll
      );
      const systemPrompt = buildPromptWithSkills(agent, agentSkills, universalSkills);

      // Langue des livrables si non-français
      const langNote =
        deliverableLanguage && deliverableLanguage !== "fr"
          ? `\n\n[LANGUE : ${deliverableLanguage.toUpperCase()}]`
          : "";

      // Connecteurs et outils de l'agent
      const extra: Record<string, string> = { ...allConnectorKeys };
      (Object.entries(connectorKeys) as [string, string][]).forEach(([k, v]) => {
        if (v) extra[k] = extra[k] || v;
      });

      const toolKeyMap: ToolKeys = {
        openai: extra.openai, bfl: extra.bfl, e2b: extra.e2b,
        notion: extra.notion, github: extra.github, tavily: extra.tavily,
        extra,
      };

      const explicitConnectors = agent.connectors ?? [];
      const allConfiguredIds = Object.keys(extra).filter(
        (k) => !k.startsWith("__") && !!extra[k]
      );
      const agentConnectorIds =
        explicitConnectors.length > 0 ? explicitConnectors : allConfiguredIds;

      const agentTools = buildToolDefinitions(agentConnectorIds, toolKeyMap, customConnectors);

      // MCP tools
      const mcpTools: import("@/lib/chainEngine").ToolDefinition[] = [];
      for (const [serverId, state] of Object.entries(mcpStates)) {
        if (state.status !== "running") continue;
        for (const tool of state.tools) {
          mcpTools.push({
            name: `mcp__${serverId}__${tool.name}`,
            description: `[MCP] ${tool.description}`,
            input_schema: tool.input_schema as Record<string, unknown>,
          });
        }
      }
      const allTools = [...agentTools, ...mcpTools];

      // Infos outils pour le contexte
      const toolsInfo =
        allTools.length > 0
          ? `\n\n[OUTILS DISPONIBLES]\n${allTools
              .map((t) => `- ${t.name.startsWith("mcp__") ? `[MCP] ${t.description.replace("[MCP] ", "")}` : (CONNECTOR_LABELS[t.name] ?? t.name)}`)
              .join("\n")}\nUtilise ces outils quand pertinent.`
          : "";

      setStreaming(agentId);

      if (allTools.length > 0) {
        // ── Mode tool use ───────────────────────────────────────────
        const reqId = generateId();

        await new Promise<void>((resolve) => {
          const unlisteners: Array<() => void> = [];

          const setup = async () => {
            const unChunk = await listen<string>(`anthropic-chunk-${reqId}`, (ev) => {
              appendStreaming(ev.payload);
            });
            const unDone = await listen<unknown>(`anthropic-done-${reqId}`, () => {
              unlisteners.forEach((fn) => fn());
              resolve();
            });
            const unErr = await listen<string>(`anthropic-error-${reqId}`, () => {
              unlisteners.forEach((fn) => fn());
              resolve();
            });
            const unToolUse = await listen<{ tool_name: string; tool_use_id: string; input: unknown }>(
              `anthropic-tool-use-${reqId}`,
              (ev) => {
                const label =
                  ev.payload.tool_name === "execute_code"
                    ? "⚙️ E2B exécute le code…"
                    : ev.payload.tool_name === "web_search"
                    ? "🔍 Recherche web…"
                    : ev.payload.tool_name.startsWith("generate_image")
                    ? "🎨 Génération image…"
                    : `⚙️ ${ev.payload.tool_name}…`;
                addMessage(agentId, { role: "system", content: label, agentId });
              }
            );
            const unToolResult = await listen<{
              tool_name: string;
              result: string;
              is_error: boolean;
              metadata?: unknown;
            }>(`anthropic-tool-result-${reqId}`, (ev) => {
              const { tool_name, metadata } = ev.payload;
              // Dispatch pour DeliverablePanel / VisualStudio
              document.dispatchEvent(
                new CustomEvent("tool-result", { detail: { tool_name, metadata } })
              );
              if (!ev.payload.is_error && metadata) {
                const m = metadata as Record<string, unknown>;
                // Fichiers E2B
                if (tool_name === "execute_code") {
                  const files =
                    (m.files as Array<{
                      name: string;
                      local_path: string;
                      size_bytes: number;
                    }>) ?? [];
                  files.forEach((f) =>
                    addGeneratedFile({ ...f, agentId })
                  );
                }
              }
            });
            unlisteners.push(unChunk, unDone, unErr, unToolUse, unToolResult);

            invoke("anthropic_stream_with_tools", {
              apiKey,
              model: agent.model,
              systemPrompt: systemPrompt + langNote + toolsInfo,
              userMessage: fullUserMessage,
              requestId: reqId,
              tools: allTools,
              toolKeys: toolKeyMap,
            }).catch(() => resolve());
          };

          setup();
        });
      } else {
        // ── Mode stream texte ──────────────────────────────────────
        await new Promise<void>((resolve) => {
          stream({
            apiKey,
            model: agent.model,
            systemPrompt: systemPrompt + langNote,
            userMessage: fullUserMessage,
            onChunk: appendStreaming,
            onDone: () => resolve(),
            onError: () => resolve(),
          });
        });
      }

      flushStreaming();
    },
    [
      activeAgentId, apiKey, hasValidApiKey, deliverableLanguage,
      getAgent, getActiveSkillsForAgent, skills,
      allConnectorKeys, connectorKeys, customConnectors, mcpStates,
      addMessage, setStreaming, appendStreaming, flushStreaming,
      addGeneratedFile, getMessages, stream,
    ]
  );

  return { sendMessage };
}
