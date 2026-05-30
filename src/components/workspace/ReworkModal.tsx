import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Target, Users, Edit3, User, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { useAgentStore } from "@/store/agentStore";
import { useChainStore } from "@/store/chainStore";
import { identifyAgentsFromWeaknesses } from "@/lib/ryoParser";
import { formatCost } from "@/lib/utils";
import { estimateChainCost } from "@/lib/costEstimator";
import type { DeliverableEntry } from "@/types";

interface ReworkModalProps {
  entry: DeliverableEntry | null;
  onClose: () => void;
  onLaunchChain: (brief: string, agentIds: string[]) => void;
}

type ReworkOption = "fix" | "team" | "brief" | "target";

export function ReworkModal({ entry, onClose, onLaunchChain }: ReworkModalProps) {
  const { getAgent, agents } = useAgentStore();
  const { ryoResult } = useChainStore();
  const [option, setOption] = useState<ReworkOption | null>(null);
  const [editedBrief, setEditedBrief] = useState(entry?.brief ?? "");
  const [targetAgentId, setTargetAgentId] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  if (!entry) return null;

  const weaknesses = ryoResult?.weaknesses ?? [];
  const agentsToFix = identifyAgentsFromWeaknesses(weaknesses).filter((id) =>
    entry.agents.includes(id),
  );
  const fixAgents = agentsToFix.length > 0 ? agentsToFix : entry.agents.slice(-2);

  const fixCostEst = estimateChainCost(
    fixAgents.map((id) => agents.find((a) => a.id === id)).filter(Boolean) as typeof agents,
    "project",
    entry.brief.length,
  );

  const handleLaunch = async () => {
    if (!entry) return;
    setLoading(true);
    try {
      let brief = entry.brief;
      let agentIds = entry.agents;

      if (option === "fix") {
        brief = `[CORRECTION — suite à score ${entry.score}/10]\n\nBrief original : ${entry.brief}\n\nPoints faibles à corriger :\n${weaknesses.map((w) => `- ${w}`).join("\n")}\n\nRetours utilisateur : ${userFeedback || "Corriger les points faibles identifiés par Ryo."}`;
        agentIds = fixAgents;
      } else if (option === "brief") {
        brief = editedBrief;
      } else if (option === "target" && targetAgentId) {
        brief = `[RELANCE AGENT ${targetAgentId.toUpperCase()}]\n\n${entry.brief}\n\n${userFeedback || "Retravailler l'output en tenant compte des retours précédents."}`;
        agentIds = [targetAgentId];
      }

      onLaunchChain(brief, agentIds);
      onClose();
    } finally { setLoading(false); }
  };

  const OPTIONS = [
    {
      id: "fix" as ReworkOption,
      icon: <Target size={16} />,
      title: "Corriger les points faibles",
      desc: `Relance ${fixAgents.length} agent${fixAgents.length > 1 ? "s" : ""} ciblé${fixAgents.length > 1 ? "s" : ""} • ~${formatCost(fixCostEst.min)}-${formatCost(fixCostEst.max)}`,
      color: "#10B981",
    },
    {
      id: "team" as ReworkOption,
      icon: <Users size={16} />,
      title: "Changer l'équipe",
      desc: "Repart avec une nouvelle configuration d'agents",
      color: "#6366F1",
    },
    {
      id: "brief" as ReworkOption,
      icon: <Edit3 size={16} />,
      title: "Modifier le brief",
      desc: "Ajuste le brief et relance les agents impactés",
      color: "#007AFF",
    },
    {
      id: "target" as ReworkOption,
      icon: <User size={16} />,
      title: "Cibler un agent",
      desc: "Relance un seul agent avec tes retours",
      color: "#A259FF",
    },
  ];

  return (
    <AnimatePresence>
      <motion.div key="rework-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div key="rework-modal" initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
      >
        <div className="pointer-events-auto bg-graphite border border-crystal rounded-2xl shadow-2xl overflow-hidden"
          style={{ width: 460 }} onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-crystal">
            <div>
              <p className="text-sm font-semibold text-silk">🔄 Retravailler</p>
              <p className="text-[11px] text-silk/40 mt-0.5 truncate max-w-[300px]">
                {entry.brief.slice(0, 60)}{entry.brief.length > 60 ? "…" : ""}
              </p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/30 hover:text-silk hover:bg-crystal transition-all">
              <X size={14} />
            </button>
          </div>

          <div className="p-4">
            {/* Score précédent */}
            {entry.score > 0 && (
              <div className="mb-4 flex items-center gap-2 text-xs text-silk/50">
                <span>Score précédent :</span>
                <span className="font-bold" style={{ color: entry.score >= 8 ? "#10B981" : entry.score >= 6 ? "#F59E0B" : "#EF4444" }}>
                  ⭐ {entry.score}/10
                </span>
                {weaknesses.length > 0 && (
                  <span className="text-silk/30">· {weaknesses.length} point{weaknesses.length > 1 ? "s" : ""} à corriger</span>
                )}
              </div>
            )}

            {/* Options */}
            {!option ? (
              <div className="flex flex-col gap-2">
                {OPTIONS.map((opt) => (
                  <button key={opt.id} onClick={() => setOption(opt.id)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-crystal hover:border-crystal-light bg-transparent hover:bg-graphite-light transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${opt.color}20`, border: `1px solid ${opt.color}30`, color: opt.color }}>
                      {opt.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-silk">{opt.title}</p>
                      <p className="text-[10px] text-silk/40">{opt.desc}</p>
                    </div>
                    <ChevronRight size={14} className="text-silk/20 group-hover:text-silk/50 shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button onClick={() => setOption(null)} className="text-[11px] text-silk/40 hover:text-silk/70 flex items-center gap-1 transition-colors">
                  ← Retour
                </button>

                {option === "fix" && (
                  <>
                    <p className="text-xs text-silk/60">Agents à relancer :</p>
                    <div className="flex flex-wrap gap-2">
                      {fixAgents.map((id) => {
                        const a = getAgent(id);
                        if (!a) return null;
                        return (
                          <div key={id} className="flex items-center gap-1.5 px-2 py-1 bg-graphite-light border border-crystal rounded-lg">
                            <AgentAvatar colors={a.colors as [string,string]} name={a.name} size={18} />
                            <span className="text-xs text-silk/60">{a.name}</span>
                          </div>
                        );
                      })}
                    </div>
                    <textarea
                      value={userFeedback}
                      onChange={(e) => setUserFeedback(e.target.value)}
                      placeholder="Retours supplémentaires (optionnel)…"
                      rows={2}
                      className="w-full bg-graphite-light border border-crystal rounded-xl px-3 py-2 text-xs text-silk placeholder-silk/25 focus:outline-none focus:border-electric/40 resize-none"
                    />
                  </>
                )}

                {option === "brief" && (
                  <textarea
                    value={editedBrief}
                    onChange={(e) => setEditedBrief(e.target.value)}
                    rows={5}
                    className="w-full bg-graphite-light border border-crystal rounded-xl px-3 py-2 text-xs text-silk focus:outline-none focus:border-electric/40 resize-none"
                  />
                )}

                {option === "target" && (
                  <>
                    <p className="text-xs text-silk/60">Choisir l'agent à relancer :</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {entry.agents.map((id) => {
                        const a = getAgent(id);
                        if (!a) return null;
                        return (
                          <button key={id} onClick={() => setTargetAgentId(id)}
                            className={cn(
                              "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all",
                              targetAgentId === id ? "border-electric/50 bg-electric/10" : "border-crystal hover:border-crystal-light",
                            )}>
                            <AgentAvatar colors={a.colors as [string,string]} name={a.name} size={24} />
                            <span className="text-[10px] text-silk/60">{a.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <textarea
                      value={userFeedback}
                      onChange={(e) => setUserFeedback(e.target.value)}
                      placeholder="Tes retours pour cet agent…"
                      rows={2}
                      className="w-full bg-graphite-light border border-crystal rounded-xl px-3 py-2 text-xs text-silk placeholder-silk/25 focus:outline-none focus:border-electric/40 resize-none"
                    />
                  </>
                )}

                {option === "team" && (
                  <p className="text-xs text-silk/50 leading-relaxed">
                    La chaîne repartira avec ton équipe active actuelle et le brief original.
                    Tu pourras modifier la composition dans la ChainProposalCard avant de lancer.
                  </p>
                )}

                <Button variant="primary" size="sm" onClick={handleLaunch} loading={loading}
                  disabled={option === "target" && !targetAgentId}>
                  Lancer la correction
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// helper cn local
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
