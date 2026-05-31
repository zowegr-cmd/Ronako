import { useCallback } from "react";
import { useAnthropicStream } from "./useAnthropicStream";
import { useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";
import { useChainStore } from "@/store/chainStore";
import { useConnectorStore } from "@/store/connectorStore";
import { MODEL_TIERS } from "@/types";
import type { Message } from "@/types";
import type { MarcusPersona, ExpertiseLevel } from "@/store/settingsStore";
import { buildMarcusAgentContext } from "@/lib/buildMarcusAgentContext";
import { analyzeBrief } from "@/lib/briefAnalyzer";
import { loadUserMemory, buildMemoryPrompt } from "@/lib/userMemory";

const PERSONA_SUFFIX: Record<MarcusPersona, string> = {
  direct:   "\n\n[STYLE] Ultra-concis. Maximum 3 phrases par réponse. Zéro formule de politesse.",
  detailed: "\n\n[STYLE] Détaillé. Explique tes décisions et leur contexte. Sois pédagogue.",
  coach:    "\n\n[STYLE] Coach. Pose des questions pour affiner. Challenge les idées reçues. Guide plutôt que dicter.",
  expert:   "\n\n[STYLE] Expert-à-expert. Vocabulaire technique, frameworks nommés. L'utilisateur est senior.",
};

const EXPERTISE_SUFFIX: Record<ExpertiseLevel, string> = {
  beginner:     "\n\n[NIVEAU] Débutant. Explique chaque concept simplement avec des analogies concrètes. Propose de l'aide proactivement.",
  intermediate: "\n\n[NIVEAU] Intermédiaire. Explique uniquement si demandé.",
  expert:       "\n\n[NIVEAU] Expert. Aller droit au but. Zéro pédagogie non demandée.",
};

// ─── Prompt B — Conversation libre ───────────────────────────────────────────
// Source personnalité : x1xhlol/system-prompts-and-models-of-ai-tools (⭐137K)
// Source méthode : SCQ McKinsey (managementconsulted.com/pyramid-principle)
//                  JTBD Christensen Harvard (aha.io/roadmapping/guide/jtbd)
// Source comportement : Manus message_rules (gist.github.com/jlia0/db0a9695b3ca7609c9b1a08dcbf872c9)
// Source post-chaîne : After Action Review US Army → McKinsey
// RÈGLE : Zéro nom d'agent hardcodé — Marcus lit [AGENTS DISPONIBLES] injectés dynamiquement
const MARCUS_CONVERSATION_PROMPT = `Tu es Marcus, Directeur de Projet IA de Ronako.

<identity>
Tu n'es pas un assistant complaisant. Tu es un expert exigeant qui a dirigé des centaines de projets complexes. Tu penses vite, parles peu, vas droit à l'essentiel.

CE QUE TU N'ES PAS :
- Un chatbot qui dit "super idée !" ou "parfait !"
- Un assistant qui accepte tout sans questionner
- Un agent qui improvise sans données réelles
</identity>

<method>
Pour chaque brief, analyse silencieusement :

SCQ (Situation / Complication / Question) :
SITUATION : Ce qui est stable et connu
COMPLICATION : Le vrai problème sous-jacent
QUESTION : La vraie question à résoudre (1 seule, mesurable)

JTBD (Jobs To Be Done) :
Fonctionnel : ce que l'utilisateur veut FAIRE
Émotionnel : ce qu'il veut RESSENTIR
Social : comment il veut être PERÇU

SCORE BRIEF (0-10) :
Objectif mesurable présent   → +3 pts
Secteur et cible identifiés  → +3 pts
Contraintes mentionnées      → +2 pts
Différenciateur clair        → +2 pts
</method>

<behavior_rules>
Score < 4 (brief vague) :
Poser UNE question — la plus critique.
Attendre la réponse. Ne JAMAIS proposer de lancer.

Score 4-7 (brief acceptable) :
Signaler CE QUI MANQUE en 1 phrase.
Proposer de lancer quand même avec avertissement.

Score > 7 (brief bon) :
Confirmer la compréhension en 1 phrase.
Proposer "✅ Lancer la chaîne" directement.

TU NE FAIS JAMAIS :
- "Super !", "Parfait !", "Bien sûr !"
- Simuler les réponses des autres agents
- Mentionner des agents hors de [AGENTS DISPONIBLES]

TU FAIS TOUJOURS :
- Maximum 3 phrases par réponse sauf analyse nécessaire
- Identifier le vrai job derrière la demande
- Challenger les hypothèses non vérifiées
- Répondre aux questions sur l'équipe depuis [AGENTS DISPONIBLES] uniquement
</behavior_rules>

<questions_arsenal>
À utiliser quand pertinent — une seule à la fois :
"Quel résultat MESURABLE attendez-vous ?"
"Pourquoi maintenant et pas dans 6 mois ?"
"Qui sont vos 3 concurrents directs ?"
"Quel est votre différenciateur réel ?"
"Comment saurez-vous que c'est réussi ?"
"Quel budget avez-vous pour ce projet ?"
"Avez-vous déjà essayé ? Pourquoi ça n'a pas marché ?"
</questions_arsenal>

<post_chain_behavior>
Après chaque chaîne terminée, analyse selon ce format :
Score ≥ 9/10 : "[X]/10 — [1 point fort précis]. [Si équipe inédite] Sauvegarder ?"
Score 7-8/10 : "[X]/10 — Cause : [précis]. Fix : relancer [agent] avec [instruction]. ~$[X]"
Score < 7/10 : "[X]/10 — Cause : [AAR précis]. Recommande : [action 1] + [action 2]."
Jamais vague. Toujours précis et actionnable.
</post_chain_behavior>

Tu parles en français.`;

export function useMarcusChat() {
  const { stream, abort } = useAnthropicStream();
  const { apiKey, hasValidApiKey, marcusPersona, expertiseLevel } = useSettingsStore();
  const { getAgent, agents, skills } = useAgentStore();
  const { keys: connectorKeys } = useConnectorStore();
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

      // ── Contexte de conversation (10 derniers messages) ──────────────
      const context = history
        .filter((m) => (m.role !== "system" && m.agentId === "marcus") || m.role === "user")
        .slice(-10)
        .map((m) => (m.role === "user" ? `Utilisateur: ${m.content}` : `Marcus: ${m.content}`))
        .join("\n\n");

      const prompt = context
        ? `${context}\n\nUtilisateur: ${userText}`
        : userText;

      // ── Agents disponibles temps-réel ────────────────────────────────
      const configuredConnectors = Object.entries(connectorKeys)
        .filter(([, v]) => v && v.trim() !== "")
        .map(([k]) => k);

      const agentContext = buildMarcusAgentContext({
        agents,
        skills,
        configuredConnectors,
      });

      // ── Mémoire utilisateur (chargée silencieusement) ─────────────────
      let memoryBlock = "";
      try {
        const memory = await loadUserMemory();
        memoryBlock = buildMemoryPrompt(memory);
      } catch { /* silencieux */ }

      // ── Analyse du brief (si message substantiel) ─────────────────────
      let briefScoreBlock = "";
      if (userText.length > 50 && hasValidApiKey()) {
        try {
          const analysis = await analyzeBrief(userText, apiKey);
          if (analysis.score <= 7) {
            briefScoreBlock = `\n\n[BRIEF SCORE: ${analysis.score}/10${analysis.issues?.length ? ` — ${analysis.issues.join(", ")}` : ""}${analysis.questions?.length ? ` — Question suggérée: "${analysis.questions[0]}"` : ""}]`;
          }
        } catch { /* silencieux — ne jamais bloquer Marcus */ }
      }

      // ── Prompt système enrichi ────────────────────────────────────────
      const enrichedPrompt = MARCUS_CONVERSATION_PROMPT
        + `\n\n${agentContext}`
        + (memoryBlock ? `\n\n${memoryBlock}` : "")
        + PERSONA_SUFFIX[marcusPersona]
        + EXPERTISE_SUFFIX[expertiseLevel];

      setStreaming(marcus.id);

      await new Promise<void>((resolve) => {
        stream({
          apiKey,
          model: marcus.model ?? MODEL_TIERS.orchestrator,
          systemPrompt: enrichedPrompt,
          userMessage: prompt + briefScoreBlock,
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
    [apiKey, hasValidApiKey, marcusPersona, expertiseLevel, getAgent, agents, skills, connectorKeys, stream, addWorkspaceMessage, setStreaming, appendStreaming, flushStreaming]
  );

  return { sendToMarcus, abort };
}
