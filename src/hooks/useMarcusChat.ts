import { useCallback } from "react";
import { useAnthropicStream } from "./useAnthropicStream";
import { useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";
import { useChainStore } from "@/store/chainStore";
import { MODEL_TIERS } from "@/types";
import type { Message } from "@/types";

const MARCUS_CONVERSATION_PROMPT = `Tu es Marcus, Chef d'Orchestre de l'équipe IA Ronako.

En mode conversation, tu es le copilote stratégique de l'utilisateur — pas un exécutant automatique.

Ton rôle ici :
- Écouter attentivement ce que l'utilisateur veut accomplir
- Poser des questions précises pour clarifier le brief
- Reformuler et valider ta compréhension
- Proposer des angles ou stratégies pertinentes
- Présenter l'équipe d'agents disponibles si l'utilisateur veut savoir qui peut faire quoi

Ce que tu NE FAIS PAS :
- Tu ne lances jamais la chaîne tout seul
- Tu n'écris pas de "output" pour les autres agents
- Tu ne simules pas les réponses des autres agents

Quand tu penses avoir un brief suffisamment clair pour lancer la chaîne, tu proposes explicitement :
"✅ Je pense avoir suffisamment d'informations. Cliquez sur **Lancer la chaîne** quand vous êtes prêt."

Tu parles en français, avec concision et clarté. Pas de longs paragraphes inutiles.`;

export function useMarcusChat() {
  const { stream, abort } = useAnthropicStream();
  const { apiKey, hasValidApiKey } = useSettingsStore();
  const { getAgent } = useAgentStore();
  const {
    addWorkspaceMessage,
    setStreaming,
    appendStreaming,
    flushStreaming,
  } = useChainStore();

  const sendToMarcus = useCallback(
    async (userText: string, history: Message[]) => {
      addWorkspaceMessage({ role: "user", content: userText });

      const marcus = getAgent("marcus");
      if (!marcus) return;

      if (!hasValidApiKey()) {
        addWorkspaceMessage({
          role: "assistant",
          agentId: "marcus",
          content:
            "Bonjour ! Pour activer les réponses IA, configurez votre clé API Anthropic dans les **Paramètres** (icône engrenage).",
        });
        return;
      }

      // Construire le contexte de conversation (10 derniers messages)
      const context = history
        .filter((m) => m.role !== "system" && m.agentId === "marcus" || m.role === "user")
        .slice(-10)
        .map((m) => (m.role === "user" ? `Utilisateur: ${m.content}` : `Marcus: ${m.content}`))
        .join("\n\n");

      const prompt = context
        ? `${context}\n\nUtilisateur: ${userText}`
        : userText;

      setStreaming(marcus.id);

      await new Promise<void>((resolve) => {
        stream({
          apiKey,
          model: marcus.model ?? MODEL_TIERS.orchestrator,
          systemPrompt: MARCUS_CONVERSATION_PROMPT,
          userMessage: prompt,
          onChunk: appendStreaming,
          onDone: () => {
            flushStreaming();
            resolve();
          },
          onError: (err) => {
            flushStreaming();
            addWorkspaceMessage({
              role: "system",
              content: `Erreur API (Marcus) : ${err}`,
            });
            resolve();
          },
        });
      });
    },
    [apiKey, hasValidApiKey, getAgent, stream, addWorkspaceMessage, setStreaming, appendStreaming, flushStreaming]
  );

  return { sendToMarcus, abort };
}
