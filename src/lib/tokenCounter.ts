import type { ModelId } from "@/types";
import { MODEL_COST_RATES } from "@/types";

export function estimateTokens(text: string): number {
  // ~4 chars per token for French/English mixed text
  return Math.ceil(text.length / 3.8);
}

export function calculateCost(
  model: ModelId,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates = MODEL_COST_RATES[model];
  // Cost in centimes (rates are per 1k tokens in euros → *100 for centimes)
  return (inputTokens / 1000) * rates.input * 100 + (outputTokens / 1000) * rates.output * 100;
}

export function estimateChainCost(
  agents: Array<{ model: ModelId }>,
  promptLength: number,
): number {
  let totalCost = 0;
  let cumulativeLength = promptLength;
  for (const agent of agents) {
    const inputTokens = estimateTokens(cumulativeLength.toString()) + estimateTokens("x".repeat(cumulativeLength));
    const outputTokens = Math.ceil(inputTokens * 0.6);
    totalCost += calculateCost(agent.model, inputTokens, outputTokens);
    cumulativeLength += outputTokens * 4;
  }
  return totalCost;
}
