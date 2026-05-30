import { TrendingUp, Zap } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { useChainStore } from "@/store/chainStore";
import { formatCost, formatTokens } from "@/lib/utils";

export function BudgetCounter() {
  const { sessionSpend, monthlySpend, monthlyBudgetCap } = useSettingsStore();
  const { run, relaySavedTokens, relayCallCount } = useChainStore();
  const usedPct = Math.min((monthlySpend / monthlyBudgetCap) * 100, 100);
  const isWarning = usedPct > 70;
  const isDanger = usedPct > 90;

  // Estimation de l'économie Relay en centimes
  // Relay économise ~relaySavedTokens de tokens output Sonnet (~0.15¢/1k)
  const relaySavingsCents = (relaySavedTokens / 1000) * 0.15;
  const showRelayStats = relayCallCount > 0 && relaySavedTokens > 0;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-graphite border border-crystal rounded-xl">
      <TrendingUp size={13} className="text-silk/30 shrink-0" />
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-silk">
            {formatCost(sessionSpend)}
          </span>
          <span className="text-[10px] text-silk/30">session</span>
          {run.totalTokens > 0 && (
            <span className="text-[10px] text-silk/25">
              · {formatTokens(run.totalTokens)} tok
            </span>
          )}
        </div>

        {/* Économie Relay */}
        {showRelayStats ? (
          <div className="flex items-center gap-1">
            <Zap size={8} className="text-mystic/60" />
            <span className="text-[9px] text-mystic/60 font-medium">
              Relay −{formatCost(relaySavingsCents)} · {formatTokens(relaySavedTokens)} tok économisés
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-16 bg-crystal rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isDanger ? "bg-danger" : isWarning ? "bg-warning" : "bg-success"
                }`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <span className="text-[10px] text-silk/25">{formatCost(monthlySpend)}/mois</span>
          </div>
        )}
      </div>
    </div>
  );
}
