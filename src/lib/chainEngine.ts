import type { Agent, Message, ModelId } from "@/types";
import { generateId, now } from "@/lib/utils";
import { calculateCost, estimateTokens } from "@/lib/tokenCounter";

export interface ChainContext {
  projectName: string;
  projectState?: string;
  userBrief: string;
  folderContext?: string; // contenu des fichiers du dossier lié
}

export interface AgentResult {
  agentId: string;
  content: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export function buildAgentPrompt(
  agent: Agent,
  context: ChainContext,
  previousOutput: string,
  agentIndex: number,
): string {
  const header = `[${agent.name} — ${agent.role}]\n\n`;
  const isFirst = agentIndex === 0;

  // Le contexte fichiers est injecté uniquement au premier agent (ou si l'agent a file_read)
  const injectFiles = (isFirst || agent.tools.includes("file_read")) && context.folderContext;
  const fileSection = injectFiles
    ? `\n\n${context.folderContext}\n`
    : "";

  if (isFirst) {
    return `${header}Projet : ${context.projectName}

Brief :
${context.userBrief}
${context.projectState ? `\nÉtat du projet :\n${context.projectState}\n` : ""}${fileSection}
Traite ce brief selon ton rôle et produis ton output.`;
  }
  return `${header}Projet : ${context.projectName}
${fileSection}
Brief initial :
${context.userBrief}

Output de l'étape précédente :
${previousOutput}

En te basant sur ce qui précède, produis ton output selon ton rôle. Sois précis et actionnable.`;
}

export function resultToMessage(result: AgentResult, model: ModelId): Message {
  return {
    id: generateId(),
    role: "assistant",
    content: result.content,
    agentId: result.agentId,
    timestamp: now(),
    tokens: result.inputTokens + result.outputTokens,
    cost: calculateCost(model, result.inputTokens, result.outputTokens),
  };
}

export function mockAgentResponse(agent: Agent, prompt: string): AgentResult {
  const mockOutput = `[${agent.name} — ${agent.role}]\n\nOutput simulé pour la démonstration Phase 1.\n\nPrompt reçu (${estimateTokens(prompt)} tokens estimés).\n\nEn production, cette zone contiendra la réponse complète de l'agent via l'API Anthropic avec streaming en temps réel.`;
  const inputTokens = estimateTokens(prompt);
  const outputTokens = estimateTokens(mockOutput);
  return {
    agentId: agent.id,
    content: mockOutput,
    inputTokens,
    outputTokens,
    cost: calculateCost(agent.model, inputTokens, outputTokens),
  };
}
