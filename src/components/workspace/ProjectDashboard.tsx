import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, BarChart2, Clock, Users, Award } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useChainStore } from "@/store/chainStore";
import { useSettingsStore } from "@/store/settingsStore";
import { loadLibrary } from "@/lib/libraryManager";
import { CHAIN_MODES } from "@/lib/chainModes";
import type { DeliverableEntry } from "@/types";
import { formatCost, relativeTime } from "@/lib/utils";

interface ProjectDashboardProps {
  open: boolean;
  onClose: () => void;
}

export function ProjectDashboard({ open, onClose }: ProjectDashboardProps) {
  const { getActiveProject } = useProjectStore();
  const { relaySavedTokens } = useChainStore();
  const { monthlySpend } = useSettingsStore();
  const [entries, setEntries] = useState<DeliverableEntry[]>([]);
  const project = getActiveProject();

  useEffect(() => {
    if (!open || !project) return;
    loadLibrary(project.path).then(setEntries).catch(() => setEntries([]));
  }, [open, project?.id]);

  if (!project) return null;

  // Stats calculées
  const totalCost = entries.reduce((s, e) => s + e.realCost, 0);
  const avgScore = entries.length > 0
    ? (entries.reduce((s, e) => s + e.score, 0) / entries.length).toFixed(1)
    : "–";
  const scores = entries.map((e) => e.score).filter((s) => s > 0);
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const relaySavings = (relaySavedTokens / 1000) * 0.15; // centimes estimés

  // Agents les plus utilisés
  const agentUsage: Record<string, number> = {};
  entries.forEach((e) => e.agents.forEach((id) => { agentUsage[id] = (agentUsage[id] ?? 0) + 1; }));
  const topAgents = Object.entries(agentUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="db-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div key="db-panel"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none"
          >
            <div className="pointer-events-auto bg-graphite border border-crystal rounded-2xl shadow-2xl overflow-hidden"
              style={{ width: 680, maxHeight: "85vh" }}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-crystal">
                <div>
                  <h2 className="text-sm font-bold text-silk">{project.name}</h2>
                  <p className="text-[11px] text-silk/40 mt-0.5">
                    {entries.length} chaîne{entries.length !== 1 ? "s" : ""} · {formatCost(totalCost)} total
                    {project.path && project.path !== "/" && ` · ${relativeTime(project.lastOpened)}`}
                  </p>
                </div>
                <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/30 hover:text-silk hover:bg-crystal transition-all">
                  <X size={14} />
                </button>
              </div>

              <div className="overflow-y-auto p-5 flex flex-col gap-5">
                {/* Stats cards */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Chaînes", value: entries.length.toString(), icon: <BarChart2 size={14} />, color: "#007AFF" },
                    { label: "Score moyen", value: `${avgScore}/10`, icon: <Award size={14} />, color: "#10B981" },
                    { label: "Dépensé", value: formatCost(totalCost), icon: <TrendingUp size={14} />, color: "#F59E0B" },
                    { label: "Relay économise", value: `~${formatCost(relaySavings)}`, icon: <Clock size={14} />, color: "#A259FF" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-graphite-light border border-crystal rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1" style={{ color: stat.color }}>
                        {stat.icon}
                        <span className="text-[10px] text-silk/40">{stat.label}</span>
                      </div>
                      <p className="text-lg font-bold text-silk">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Évolution des scores */}
                {scores.length > 1 && (
                  <div>
                    <p className="text-xs text-silk/40 uppercase tracking-widest mb-3">Évolution qualité</p>
                    <ScoreChart scores={entries.slice().reverse().map((e) => e.score)} />
                  </div>
                )}

                {/* Benchmark */}
                {scores.length > 0 && (
                  <div className="bg-graphite-light border border-crystal rounded-xl p-4">
                    <p className="text-xs text-silk/40 uppercase tracking-widest mb-2">Benchmark</p>
                    <div className="flex flex-col gap-1.5 text-xs">
                      <Row label="Meilleur score ce projet" value={`${maxScore}/10`} good={maxScore >= 8} />
                      <Row label="Score moyen ce projet" value={`${avgScore}/10`} good={Number(avgScore) >= 7} />
                      <Row label="Dépenses ce mois" value={formatCost(monthlySpend)} />
                    </div>
                  </div>
                )}

                {/* Agents les plus utilisés */}
                {topAgents.length > 0 && (
                  <div>
                    <p className="text-xs text-silk/40 uppercase tracking-widest mb-3">
                      <Users size={11} className="inline mr-1" />Agents les plus utilisés
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {topAgents.map(([id, count]) => (
                        <div key={id} className="flex items-center gap-1.5 px-2.5 py-1 bg-graphite-light border border-crystal rounded-lg">
                          <span className="text-xs font-medium text-silk/70 capitalize">{id}</span>
                          <span className="text-[10px] text-silk/30">{count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {entries.length > 0 && (
                  <div>
                    <p className="text-xs text-silk/40 uppercase tracking-widest mb-3">Timeline</p>
                    <div className="flex flex-col gap-0">
                      {entries.slice(0, 8).map((entry, i) => {
                        const mode = CHAIN_MODES[entry.mode] ?? CHAIN_MODES.project;
                        const isLast = i === Math.min(entries.length, 8) - 1;
                        return (
                          <div key={entry.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 rounded-full bg-electric/60 shrink-0 mt-0.5" />
                              {!isLast && <div className="w-px flex-1 bg-crystal/50 mt-1" />}
                            </div>
                            <div className={`pb-3 flex-1 min-w-0 ${isLast ? "" : ""}`}>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] text-silk/30">{new Date(entry.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                                <span className="text-[10px]">{mode.icon}</span>
                                {entry.score > 0 && <span className="text-[10px] text-silk/50">⭐{entry.score}/10</span>}
                                <span className="text-[10px] text-silk/30">{formatCost(entry.realCost)}</span>
                              </div>
                              <p className="text-xs text-silk/60 truncate">{entry.brief.slice(0, 70)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {entries.length === 0 && (
                  <div className="text-center py-8">
                    <BarChart2 size={24} className="mx-auto text-silk/15 mb-2" />
                    <p className="text-sm text-silk/30">Aucune donnée disponible</p>
                    <p className="text-xs text-silk/20 mt-1">Lance une chaîne pour voir les statistiques</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Graphe scores SVG ────────────────────────────────────────────────────────
function ScoreChart({ scores }: { scores: number[] }) {
  const visible = scores.slice(-12);
  const h = 48, w = 100, pad = 4;
  const xs = visible.map((_, i) => pad + (i / Math.max(visible.length - 1, 1)) * (w - pad * 2));
  const ys = visible.map((s) => h - pad - ((s / 10) * (h - pad * 2)));

  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  const colorClass = Number(scores.at(-1) ?? 0) >= 8 ? "#10B981" : Number(scores.at(-1) ?? 0) >= 6 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex items-end gap-1">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-xs h-12">
        <path d={path} fill="none" stroke={colorClass} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r="2" fill={colorClass} />
        ))}
      </svg>
      <div className="text-[10px] text-silk/30 leading-none">
        <div>{Math.max(...scores)}</div>
        <div className="mt-3">0</div>
      </div>
    </div>
  );
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-silk/50">{label}</span>
      <span className={good === true ? "text-success font-medium" : good === false ? "text-warning font-medium" : "text-silk/70"}>{value}</span>
    </div>
  );
}
