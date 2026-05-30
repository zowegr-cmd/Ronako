import type { Agent, ModelId } from "@/types";
import { MODEL_COST_RATES } from "@/types";
import type { ChainMode } from "@/lib/chainModes";
import { CHAIN_MODES, resolveAgentModel } from "@/lib/chainModes";

export interface AgentCostItem {
  agentId: string;
  agentName: string;
  model: ModelId;
  estimatedCents: number;
  isRelay: boolean;
}

export interface CostEstimate {
  min: number;                           // centimes minimum
  max: number;                           // centimes maximum
  mid: number;                           // estimation centrale
  breakdown: AgentCostItem[];           // détail par agent + relay
  tokensEstimate: number;               // tokens totaux estimés
  savingsVsNaive: number;               // économie vs sans Relay (centimes)
  relayCallCount: number;
}

// Estimation tokens par agent selon son rôle
const TOKEN_ESTIMATES: Record<string, { input: number; output: number }> = {
  marcus:  { input: 600,  output: 800  },
  omar:    { input: 500,  output: 600  },
  sofia:   { input: 500,  output: 500  },
  camille: { input: 450,  output: 400  },
  leo:     { input: 600,  output: 1000 },
  maya:    { input: 900,  output: 900  },
  axel:    { input: 550,  output: 700  },
  nina:    { input: 550,  output: 800  },
  tom:     { input: 500,  output: 600  },
  ella:    { input: 700,  output: 1200 },
  ryo:     { input: 800,  output: 500  },
  sam:     { input: 600,  output: 700  },
  // Relay (entre chaque agent)
  relay:   { input: 300,  output: 150  },
};

const DEFAULT_TOKENS = { input: 500, output: 600 };
const RELAY_SONNET_MODEL: ModelId = "claude-sonnet-4-6";

function centsCost(model: ModelId, input: number, output: number): number {
  const rates = MODEL_COST_RATES[model];
  if (!rates) return 0;
  // rates.input/output sont en € pour 1000 tokens → × 100 pour centimes
  return (input / 1000) * rates.input * 100 + (output / 1000) * rates.output * 100;
}

export function estimateChainCost(
  agents: Agent[],
  mode: ChainMode,
  briefLength = 200,
): CostEstimate {
  const modeConfig = CHAIN_MODES[mode];
  const relayActive = modeConfig.relayActive;
  const breakdown: AgentCostItem[] = [];
  let totalMin = 0;
  let totalMax = 0;
  let totalTokens = 0;
  let relayCount = 0;

  // Ajustement selon longueur du brief
  const briefFactor = Math.min(2, 1 + briefLength / 500);

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const toks = TOKEN_ESTIMATES[agent.id] ?? DEFAULT_TOKENS;
    const scaledInput = Math.round(toks.input * briefFactor);
    const scaledOutput = Math.round(toks.output);
    const model = resolveAgentModel(agent.id, agent.model, modeConfig.modelOverride);
    const cents = centsCost(model, scaledInput, scaledOutput);
    const variance = cents * 0.3;

    breakdown.push({
      agentId: agent.id,
      agentName: agent.name,
      model,
      estimatedCents: cents,
      isRelay: false,
    });
    totalMin += cents - variance;
    totalMax += cents + variance;
    totalTokens += scaledInput + scaledOutput;

    // Relay entre chaque paire d'agents (sauf le dernier)
    if (relayActive && i < agents.length - 1) {
      const relayToks = TOKEN_ESTIMATES.relay;
      const relayCents = centsCost(RELAY_SONNET_MODEL, relayToks.input, relayToks.output);
      breakdown.push({
        agentId: `relay_${agent.id}`,
        agentName: "Relay",
        model: RELAY_SONNET_MODEL,
        estimatedCents: relayCents,
        isRelay: true,
      });
      totalMin += relayCents * 0.8;
      totalMax += relayCents * 1.2;
      totalTokens += relayToks.input + relayToks.output;
      relayCount++;
    }
  }

  // Économie vs naïf (sans Relay, tout Sonnet)
  const naiveCost = agents.reduce((sum, agent) => {
    const toks = TOKEN_ESTIMATES[agent.id] ?? DEFAULT_TOKENS;
    return sum + centsCost("claude-sonnet-4-6", toks.input * 3, toks.output); // ×3 = contexte plein sans Relay
  }, 0);
  const savingsVsNaive = Math.max(0, naiveCost - (totalMin + totalMax) / 2);

  return {
    min: Math.max(0, totalMin),
    max: totalMax,
    mid: (totalMin + totalMax) / 2,
    breakdown,
    tokensEstimate: totalTokens,
    savingsVsNaive,
    relayCallCount: relayCount,
  };
}

export function formatCentsEstimate(min: number, max: number): string {
  const fmt = (c: number) => c < 1 ? `<0.01 €` : `${(c / 100).toFixed(2)} €`;
  if (Math.abs(max - min) < 0.5) return fmt(min);
  return `${fmt(min)} — ${fmt(max)}`;
}
