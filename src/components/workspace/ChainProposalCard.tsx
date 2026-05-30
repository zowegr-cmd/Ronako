import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, X, Plus, GripVertical, ChevronDown, ChevronUp,
  Sparkles, RotateCcw, Wand2, CheckCircle2, AlertCircle,
  Pencil, Check, Dna, TrendingDown, Timer, Star,
  Info, ChevronRight,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { MODEL_LABELS, MODEL_TIER_COLOR } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { useAgentStore } from "@/store/agentStore";
import { useChainStore } from "@/store/chainStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { ModelId } from "@/types";
import { useChainOptimizer, enforceIndispensable } from "@/hooks/useChainOptimizer";
import { useChainAnalyzer } from "@/hooks/useChainAnalyzer";
import { CHAIN_MODES, getDefaultAgentsForMode, type ChainMode } from "@/lib/chainModes";
import { estimateChainCost, formatCentsEstimate } from "@/lib/costEstimator";
import { AGENT_DELIVERABLE_DESCRIPTIONS, DELIVERABLE_FORMATS } from "@/lib/formatSelector";
import type { ChainProposal, ProposedAgent, Agent, OptimizerSuggestion } from "@/types";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

const INDISPENSABLE_ROLES = new Set(["marcus", "ella", "sam"]);

const AXIS_ICONS: Record<string, React.ReactNode> = {
  cost:    <TrendingDown size={12} className="text-success shrink-0" />,
  speed:   <Timer size={12} className="text-electric shrink-0" />,
  quality: <Star size={12} className="text-warning shrink-0" />,
};

interface ChainProposalCardProps {
  proposal: ChainProposal;
  onConfirm: (brief: string, agentIds: string[]) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ChainProposalCard({ proposal, onConfirm, onCancel, loading }: ChainProposalCardProps) {
  const { agents, getAgent } = useAgentStore();
  const { projectDNA, setProjectDNA, chainMode, setChainMode, customConfig, setCustomConfig, setCustomAgentModel,
    selectedFormats, setSelectedFormats } = useChainStore();
  const { monthlyBudgetCap, monthlySpend } = useSettingsStore();
  const { optimize, optimizing } = useChainOptimizer();
  const { analyze, analyzing, suggestions: analyzerSuggestions, reset: resetAnalyzer } = useChainAnalyzer();

  const [selectedAgents, setSelectedAgents] = useState<ProposedAgent[]>(proposal.agents);
  const [showAvailable, setShowAvailable] = useState(false);
  const [optimizeChanges, setOptimizeChanges] = useState<string | null>(null);
  const [optimizeFlash, setOptimizeFlash] = useState(false);
  const [editingDNA, setEditingDNA] = useState(false);
  const [dnaInput, setDnaInput] = useState(projectDNA ?? "");
  const [showCostDetail, setShowCostDetail] = useState(false);
  const [showInfiniModal, setShowInfiniModal] = useState(false);
  const [showSkillsPanel, setShowSkillsPanel] = useState(false);
  const [tempSkillIds, setTempSkillIds] = useState<string[]>([]);

  const { skills: allSkills, setTemporarySkills } = useAgentStore();
  const allAgentIds = new Set(agents.map((a) => a.id));
  const availableAgents = agents.filter(
    (a) => !a.isSystem && !selectedAgents.find((s) => s.id === a.id),
  );
  const { added: missingIndispensable } = enforceIndispensable(selectedAgents, allAgentIds);
  // Flash suggère des agents par défaut mais rien n'est verrouillé
  const hasDefaultSuggestion = !!CHAIN_MODES[chainMode].defaultAgents;
  const modeConfig = CHAIN_MODES[chainMode];
  const currentAgentList = agents.filter((a) => selectedAgents.find((s) => s.id === a.id));

  // Estimation coût en temps réel
  const costEstimate = estimateChainCost(currentAgentList, chainMode, proposal.brief.length);

  // Quand le mode change : suggérer des agents par défaut si le mode en a (ex: Flash)
  // Les agents NE sont JAMAIS forcés — l'utilisateur peut toujours modifier
  useEffect(() => {
    const defaultIds = getDefaultAgentsForMode(proposal.agents.map(a => a.id), chainMode);
    // Seulement si le mode a une suggestion différente de la proposition actuelle
    if (CHAIN_MODES[chainMode].defaultAgents) {
      setSelectedAgents(
        defaultIds.map((id) => {
          const existing = proposal.agents.find((a) => a.id === id);
          const agentDef = agents.find((a) => a.id === id);
          return existing ?? (agentDef ? { id, reason: agentDef.role } : null);
        }).filter(Boolean) as ProposedAgent[],
      );
    } else {
      setSelectedAgents(proposal.agents);
    }
    setOptimizeChanges(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainMode]);

  // Lancer l'analyse AI en background dès l'ouverture
  useEffect(() => {
    if (proposal.brief && selectedAgents.length > 0) {
      analyze(proposal.brief, selectedAgents.map((a) => a.id), chainMode);
    }
    return () => resetAnalyzer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const oldIdx = selectedAgents.findIndex((a) => a.id === active.id);
    const newIdx = selectedAgents.findIndex((a) => a.id === over.id);
    setSelectedAgents(arrayMove(selectedAgents, oldIdx, newIdx));
  };

  const removeAgent = (id: string) => setSelectedAgents((s) => s.filter((a) => a.id !== id));

  const addAgent = (id: string) => {
    const def = agents.find((a) => a.id === id);
    if (!def) return;
    setSelectedAgents((s) => [...s, { id, reason: def.role }]);
    setShowAvailable(false);
  };

  const reset = () => { setSelectedAgents(proposal.agents); setOptimizeChanges(null); };

  const handleOptimize = async () => {
    setOptimizeChanges(null);
    const result = await optimize(selectedAgents, proposal.brief);
    if (result) {
      setOptimizeFlash(true);
      setTimeout(() => setOptimizeFlash(false), 600);
      setSelectedAgents(result.proposal.agents);
      setOptimizeChanges(result.changes);
    }
  };

  // Appliquer une suggestion de l'analyseur
  const applySuggestion = (s: OptimizerSuggestion) => {
    if (s.action === "remove-agent" && s.agentId) {
      setSelectedAgents((prev) => prev.filter((a) => a.id !== s.agentId));
    }
    resetAnalyzer();
  };

  const applyAllSuggestions = () => {
    const toRemove = new Set(
      analyzerSuggestions.filter((s) => s.action === "remove-agent" && s.agentId).map((s) => s.agentId!),
    );
    if (toRemove.size > 0) setSelectedAgents((prev) => prev.filter((a) => !toRemove.has(a.id)));
    resetAnalyzer();
  };

  const handleConfirm = () => {
    if (tempSkillIds.length > 0) setTemporarySkills(tempSkillIds);
    if (chainMode === "infinite") { setShowInfiniModal(true); return; }
    onConfirm(proposal.brief, selectedAgents.map((a) => a.id));
  };

  const handleInfiniConfirm = () => {
    setShowInfiniModal(false);
    onConfirm(proposal.brief, selectedAgents.map((a) => a.id));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 360, damping: 30 }}
      className={cn(
        "mx-4 mb-3 rounded-2xl border bg-graphite shadow-glow-mystic transition-all flex flex-col",
        optimizeFlash ? "border-success/50" : "border-mystic/30",
      )}
      style={{ maxHeight: "70vh" }}
    >
      {/* ── Header (fixe) ──────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-crystal/50 bg-mystic/5">
        <Sparkles size={14} className="text-mystic shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-silk">Proposition de Marcus</p>
          <p className="text-[11px] text-silk/40 truncate">{proposal.brief}</p>
        </div>
        <button onClick={onCancel} className="text-silk/25 hover:text-silk/60 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* ── Contenu scrollable ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">

      {/* ── Brief complet ──────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-b border-crystal/30 bg-graphite-light/40">
        <p className="text-xs text-silk/65 leading-relaxed">{proposal.brief}</p>
      </div>

      {/* ── Sélecteur Mode de Chaîne ───────────────────────────── */}
      <div className="px-4 pt-3 pb-2 border-b border-crystal/20">
        <p className="text-[10px] text-silk/30 uppercase tracking-widest mb-2">Mode de chaîne</p>
        <div className="flex gap-1.5 mb-2">
          {(["flash", "project", "infinite", "custom"] as ChainMode[]).map((m) => {
            const cfg = CHAIN_MODES[m];
            const isActive = chainMode === m;
            return (
              <button
                key={m}
                onClick={() => setChainMode(m)}
                style={isActive ? { borderColor: `${cfg.color}60`, backgroundColor: `${cfg.color}15`, color: cfg.color } : {}}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all",
                  isActive ? "" : "border-crystal text-silk/40 hover:border-crystal-light hover:text-silk/60",
                )}
              >
                <span className="text-sm">{cfg.icon}</span>
                {cfg.label}
                {cfg.isDefault && !isActive && <span className="text-[8px] text-silk/20">défaut</span>}
              </button>
            );
          })}
        </div>
        {/* Description du mode actif */}
        <div className="flex items-start gap-2 bg-graphite-light/60 rounded-xl px-3 py-2">
          <Info size={11} className="text-silk/30 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-silk/60">{modeConfig.shortDesc}</p>
            <p className="text-[10px] text-silk/30 mt-0.5">{modeConfig.useCase}</p>
          </div>
          {/* Estimation coût */}
          <div className="text-right shrink-0">
            <p className="text-[11px] font-semibold text-silk">
              {modeConfig.estimatedCost
                ? formatCentsEstimate(costEstimate.min, costEstimate.max)
                : "—"}
            </p>
            {modeConfig.estimatedTime && (
              <p className="text-[9px] text-silk/25">
                ~{Math.round(modeConfig.estimatedTime.min / 60)}-{Math.round(modeConfig.estimatedTime.max / 60)} min
              </p>
            )}
            {modeConfig.badge && (
              <p className="text-[9px] text-warning/70 mt-0.5">{modeConfig.badge}</p>
            )}
          </div>
        </div>

        {/* Détail coût (toggle) */}
        <button
          onClick={() => setShowCostDetail(!showCostDetail)}
          className="flex items-center gap-1 mt-1.5 text-[10px] text-silk/25 hover:text-silk/50 transition-colors"
        >
          <ChevronRight size={10} className={cn("transition-transform", showCostDetail && "rotate-90")} />
          {showCostDetail ? "Masquer le détail" : "Voir le détail par agent"}
          {costEstimate.savingsVsNaive > 0.5 && (
            <span className="text-success/60 ml-1">
              · Relay économise ~{formatCentsEstimate(costEstimate.savingsVsNaive, costEstimate.savingsVsNaive)}
            </span>
          )}
        </button>
        <AnimatePresence>
          {showCostDetail && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="mt-1.5 bg-graphite rounded-xl border border-crystal/50 overflow-hidden"
            >
              {costEstimate.breakdown.map((item) => (
                <div key={item.agentId} className={cn("flex items-center justify-between px-3 py-1", item.isRelay && "opacity-50")}>
                  <div className="flex items-center gap-2">
                    {item.isRelay
                      ? <span className="text-[9px] text-mystic/50 font-mono">⟡ Relay</span>
                      : <span className="text-[11px] text-silk/60">{item.agentName}</span>
                    }
                    <span className="text-[9px] text-silk/25 font-mono">{MODEL_LABELS[item.model]}</span>
                  </div>
                  <span className="text-[10px] text-silk/40 font-mono">~{formatCentsEstimate(item.estimatedCents * 0.7, item.estimatedCents * 1.3)}</span>
                </div>
              ))}
              <div className="flex justify-between px-3 py-1.5 border-t border-crystal/50">
                <span className="text-[10px] text-silk/40 font-semibold">Total estimé</span>
                <span className="text-[11px] font-bold text-silk">{formatCentsEstimate(costEstimate.min, costEstimate.max)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Panneau Custom ─────────────────────────────────────── */}
      <AnimatePresence>
        {chainMode === "custom" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-b border-crystal/30 overflow-hidden"
          >
            <div className="px-4 py-3">
              <div className="flex items-center gap-1.5 mb-3">
                <p className="text-[11px] font-semibold text-silk/50 uppercase tracking-wider">Configuration Custom</p>
                <InfoTooltip
                  title="Mode Custom"
                  description="Active ou désactive Relay (distillation de contexte ~60-80% tokens économisés) et Marcus Check (vérification cohérence silencieuse entre agents)."
                  size={11}
                />
              </div>

              {/* Toggles globaux */}
              <div className="flex gap-3 mb-3">
                <button
                  onClick={() => setCustomConfig({ relayActive: !customConfig.relayActive })}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all",
                    customConfig.relayActive
                      ? "border-mystic/40 bg-mystic/10 text-mystic"
                      : "border-crystal text-silk/35 hover:border-crystal-light",
                  )}
                >
                  <span className="text-sm">⟡</span> Relay {customConfig.relayActive ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => setCustomConfig({ marcusCheckActive: !customConfig.marcusCheckActive })}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all",
                    customConfig.marcusCheckActive
                      ? "border-electric/40 bg-electric/10 text-electric"
                      : "border-crystal text-silk/35 hover:border-crystal-light",
                  )}
                >
                  <span className="text-sm">🧠</span> Marcus Check {customConfig.marcusCheckActive ? "ON" : "OFF"}
                </button>
              </div>

              {/* Modèle par agent */}
              <p className="text-[10px] text-silk/30 mb-2">Modèle par agent (optionnel)</p>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {selectedAgents.map((pa) => {
                  const agent = getAgent(pa.id);
                  if (!agent) return null;
                  const currentModel = customConfig.agentModels[pa.id] ?? agent.model;
                  return (
                    <div key={pa.id} className="flex items-center justify-between gap-2 px-2 py-1.5 bg-graphite-light rounded-lg border border-crystal/50">
                      <div className="flex items-center gap-2">
                        <AgentAvatar colors={agent.colors as [string,string]} name={agent.name} size={20} />
                        <span className="text-xs text-silk/60">{agent.name}</span>
                      </div>
                      <div className="flex gap-1">
                        {(["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-8"] as ModelId[]).map((m) => (
                          <button
                            key={m}
                            onClick={() => setCustomAgentModel(pa.id, m)}
                            className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded font-mono border transition-all",
                              currentModel === m
                                ? "bg-electric/15 border-electric/30 text-electric"
                                : "border-crystal text-silk/25 hover:border-crystal-light",
                            )}
                          >
                            {m === "claude-haiku-4-5-20251001" ? "Haiku" : m === "claude-sonnet-4-6" ? "Sonnet" : "Opus"}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADN Projet ─────────────────────────────────────────── */}
      {(projectDNA || dnaInput) && (
        <div className="px-4 py-3 border-b border-electric/10 bg-electric/3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Dna size={12} className="text-electric/60" />
              <p className="text-[11px] font-semibold text-electric/70 uppercase tracking-wider">ADN Projet</p>
              <InfoTooltip
                title="ADN Projet"
                description="Contexte de 150 tokens partagé par tous les agents. Marcus le génère automatiquement depuis ton brief. Tu peux l'éditer pour affiner."
                size={11}
              />
            </div>
            <button
              onClick={() => { if (editingDNA) setProjectDNA(dnaInput); setEditingDNA(!editingDNA); }}
              className="flex items-center gap-1 text-[10px] text-silk/30 hover:text-electric/60 transition-colors"
            >
              {editingDNA ? <><Check size={10} className="text-success" /> Sauvegarder</> : <><Pencil size={10} /> Éditer</>}
            </button>
          </div>
          {editingDNA ? (
            <textarea
              value={dnaInput}
              onChange={(e) => setDnaInput(e.target.value)}
              rows={6}
              autoFocus
              className="w-full bg-graphite border border-electric/30 rounded-xl px-3 py-2 text-xs text-silk font-mono leading-relaxed focus:outline-none focus:border-electric/50 resize-none"
            />
          ) : (
            <div className="bg-graphite/60 rounded-xl border border-crystal/50 px-3 py-2">
              <pre className="text-[11px] text-silk/60 font-mono leading-relaxed whitespace-pre-wrap">{projectDNA || dnaInput}</pre>
            </div>
          )}
        </div>
      )}

      {/* ── Formats souhaités ──────────────────────────────────── */}
      <div className="px-4 py-2.5 border-b border-crystal/20">
        <p className="text-[10px] text-silk/30 uppercase tracking-widest mb-2">Livrables souhaités</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(DELIVERABLE_FORMATS).map((fmt) => {
            const isSelected = selectedFormats.includes(fmt.id);
            const isLocked = fmt.alwaysIncluded;
            return (
              <button
                key={fmt.id}
                disabled={isLocked}
                onClick={() => setSelectedFormats(
                  isSelected && !isLocked
                    ? selectedFormats.filter((f) => f !== fmt.id)
                    : [...selectedFormats, fmt.id]
                )}
                title={fmt.description}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border transition-all",
                  isSelected
                    ? "border-electric/40 bg-electric/10 text-electric"
                    : "border-crystal text-silk/35 hover:border-crystal-light",
                  isLocked && "opacity-60 cursor-default",
                )}
              >
                <span>{fmt.icon}</span> {fmt.label}
                {isLocked && <span className="text-[8px] text-silk/25">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Aperçu du livrable attendu ──────────────────────────── */}
      {selectedAgents.length > 0 && (
        <div className="px-4 py-2.5 border-b border-crystal/20">
          <p className="text-[10px] text-silk/30 uppercase tracking-widest mb-2">Ce que tu vas recevoir</p>
          <div className="flex flex-col gap-1">
            {selectedAgents.map((pa) => {
              const desc = AGENT_DELIVERABLE_DESCRIPTIONS[pa.id];
              if (!desc) return null;
              return (
                <div key={pa.id} className="flex items-center gap-2 text-[11px] text-silk/55">
                  <span className="shrink-0">{desc.icon}</span>
                  <span>{desc.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Résultat optimisation (bouton Optimiser) ────────────── */}
      <AnimatePresence>
        {optimizeChanges && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-success/5 border-b border-success/15"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 size={12} className="text-success shrink-0 mt-0.5" />
              <p className="text-[11px] text-success/70 leading-relaxed">{optimizeChanges}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Panel Optimiseur AI ─────────────────────────────────── */}
      <AnimatePresence>
        {(analyzing || analyzerSuggestions.length > 0) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-4 py-3 border-b border-crystal/20"
          >
            {analyzing ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-electric/50 border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] text-silk/35">Optimiseur analyse votre chaîne…</span>
              </div>
            ) : analyzerSuggestions.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-silk/60">
                    {analyzerSuggestions.length} optimisation{analyzerSuggestions.length > 1 ? "s" : ""} détectée{analyzerSuggestions.length > 1 ? "s" : ""}
                  </p>
                  <button onClick={applyAllSuggestions}
                    className="text-[10px] text-electric/60 hover:text-electric transition-colors font-medium">
                    ✅ Tout appliquer
                  </button>
                </div>
                {analyzerSuggestions.map((s) => (
                  <div key={s.id} className="flex items-start gap-2 bg-graphite-light rounded-xl p-2.5 border border-crystal/50">
                    {AXIS_ICONS[s.axis]}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-silk/70 leading-relaxed">{s.description}</p>
                      {s.savings !== undefined && s.savings > 0 && (
                        <p className="text-[10px] text-success/60 mt-0.5">Économie ~{formatCentsEstimate(s.savings * 100, s.savings * 100)}</p>
                      )}
                    </div>
                    {(s.action === "remove-agent" || s.action === "downgrade-model") && (
                      <button onClick={() => applySuggestion(s)}
                        className="text-[10px] text-electric/60 hover:text-electric border border-electric/30 rounded-lg px-2 py-1 transition-all shrink-0">
                        Appliquer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Warning indispensables manquants ───────────────────── */}
      <AnimatePresence>
        {missingIndispensable.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-warning/5 border-b border-warning/15"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={12} className="text-warning/70 shrink-0" />
              <p className="text-[11px] text-warning/70">Agents indispensables absents : {missingIndispensable.join(", ")}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Liste agents ───────────────────────────────────────── */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-silk/35 uppercase tracking-widest">
            Chaîne — {selectedAgents.length} agent{selectedAgents.length > 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-1.5">
            <button onClick={reset} className="text-[10px] text-silk/25 hover:text-silk/60 flex items-center gap-1 transition-colors">
              <RotateCcw size={9} /> Reset
            </button>
            <Button variant="mystic" size="sm" className="h-6 text-[11px] px-2.5" onClick={handleOptimize} loading={optimizing} disabled={optimizing}>
              <Wand2 size={11} /> {optimizing ? "Optimisation…" : "Optimiser"}
            </Button>
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={selectedAgents.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1.5">
              {selectedAgents.map((pa, i) => {
                const agent = getAgent(pa.id) as Agent | undefined;
                if (!agent) return null;
                return (
                  <ProposalAgentRow
                    key={pa.id}
                    index={i}
                    proposedAgent={pa}
                    agent={agent}
                    isIndispensable={INDISPENSABLE_ROLES.has(pa.id)}
                    onRemove={() => removeAgent(pa.id)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {/* Ajouter un agent — masqué si agents verrouillés par le mode */}
        <div className="mt-2">
          {hasDefaultSuggestion && (
            <p className="text-[10px] text-silk/25 italic mb-1">
              ⚡ Agents suggérés pour ce mode — modifiable librement
            </p>
          )}
          <button
            onClick={() => setShowAvailable(!showAvailable)}
            disabled={availableAgents.length === 0}
            className="flex items-center gap-1.5 text-[11px] text-silk/30 hover:text-electric/70 transition-colors disabled:opacity-30"
          >
            <Plus size={11} />
            Ajouter un agent
            {availableAgents.length > 0 && <span className="text-silk/20">({availableAgents.length})</span>}
            {showAvailable ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          <AnimatePresence>
            {showAvailable && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="mt-1.5 flex flex-col gap-1 overflow-hidden"
              >
                {availableAgents.map((a) => (
                  <button key={a.id} onClick={() => addAgent(a.id)}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-crystal hover:border-electric/30 hover:bg-electric/5 transition-all text-left group"
                  >
                    <AgentAvatar colors={a.colors as [string,string]} name={a.name} size={22} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-silk/70 group-hover:text-silk">{a.name}</p>
                      <p className="text-[10px] text-silk/30 truncate">{a.role}</p>
                    </div>
                    <Plus size={11} className="text-silk/20 group-hover:text-electric/60 shrink-0" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Skills pour cette chaîne ────────────────────────────── */}
      <div className="px-4 py-2 border-t border-crystal/20 shrink-0">
        <button onClick={() => setShowSkillsPanel(!showSkillsPanel)}
          className="flex items-center gap-1.5 text-[11px] text-silk/30 hover:text-electric/60 transition-colors w-full">
          <span>⚡</span>
          <span>Skills temporaires pour cette chaîne</span>
          {tempSkillIds.length > 0 && <Badge variant="electric" className="text-[9px] ml-1">{tempSkillIds.length} actifs</Badge>}
          <span className="ml-auto text-[10px]">{showSkillsPanel ? "▲" : "▼"}</span>
        </button>
        <AnimatePresence>
          {showSkillsPanel && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="mt-2 flex flex-col gap-1.5 max-h-32 overflow-y-auto">
              {allSkills.filter((s) => !s.isActive && selectedAgents.some((a) => s.agentIds.includes(a.id))).map((sk) => (
                <label key={sk.id} className="flex items-center gap-2 text-[11px] text-silk/50 cursor-pointer">
                  <input type="checkbox" checked={tempSkillIds.includes(sk.id)}
                    onChange={() => setTempSkillIds((ids) => ids.includes(sk.id) ? ids.filter((i) => i !== sk.id) : [...ids, sk.id])}
                    className="accent-electric" />
                  <span>{sk.name}</span>
                  <span className="text-silk/25 text-[9px]">({sk.agentIds.join(", ")})</span>
                </label>
              ))}
              {allSkills.filter((s) => !s.isActive && selectedAgents.some((a) => s.agentIds.includes(a.id))).length === 0 && (
                <p className="text-[10px] text-silk/25">Aucun skill inactif disponible pour ces agents.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      </div>{/* fin contenu scrollable */}

      {/* ── Actions (collées en bas, toujours visibles) ─────────── */}
      <div className="flex gap-2 px-4 py-3 border-t border-crystal/50 bg-graphite shrink-0">
        <Button variant="ghost" size="sm" onClick={onCancel} className="flex-1">Modifier le brief</Button>
        <Button
          variant={chainMode === "infinite" ? "mystic" : "primary"}
          size="sm"
          onClick={handleConfirm}
          loading={loading}
          disabled={selectedAgents.length === 0 || loading || optimizing}
          className="flex-1"
        >
          <Zap size={12} />
          {CHAIN_MODES[chainMode].icon} Lancer {selectedAgents.length} agent{selectedAgents.length > 1 ? "s" : ""}
        </Button>
      </div>

      {/* ── Modal confirmation Mode Infini ─────────────────────── */}
      <Modal open={showInfiniModal} onClose={() => setShowInfiniModal(false)} title="♾️ Mode Infini — Confirmation" size="sm">
        <div className="flex flex-col gap-4">
          <div className="bg-mystic/10 border border-mystic/20 rounded-xl p-3">
            <p className="text-xs text-silk/70 leading-relaxed">
              Tous les agents tournent en <strong className="text-silk">Opus 4.8</strong>.
              Chaque agent reçoit le contexte complet sans Relay.
              Double validation Ryo automatique (retry si score &lt; 9).
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-silk/50">Estimation</span>
              <span className="text-warning font-semibold">
                {formatCentsEstimate(CHAIN_MODES.infinite.estimatedCost!.min, CHAIN_MODES.infinite.estimatedCost!.max)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-silk/50">Durée estimée</span>
              <span className="text-silk/70">~15-30 minutes</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-silk/50">Budget restant ce mois</span>
              <span className={cn("font-semibold", monthlySpend > monthlyBudgetCap * 0.8 ? "text-warning" : "text-silk/70")}>
                {formatCentsEstimate(Math.max(0, monthlyBudgetCap - monthlySpend), Math.max(0, monthlyBudgetCap - monthlySpend))}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-silk/35 text-center">
            ⚠️ Cette chaîne sera débitée sur ton budget mensuel Anthropic.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowInfiniModal(false)} className="flex-1">Annuler</Button>
            <Button variant="mystic" size="sm" onClick={handleInfiniConfirm} className="flex-1">
              ♾️ Confirmer et lancer
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

// ─── Row agent dans la proposition ───────────────────────────────────────────
function ProposalAgentRow({
  proposedAgent, agent, index, isIndispensable, onRemove,
}: { proposedAgent: ProposedAgent; agent: Agent; index: number; isIndispensable: boolean; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: proposedAgent.id });
  const tierColor = MODEL_TIER_COLOR[agent.model as keyof typeof MODEL_TIER_COLOR];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border group transition-all",
        isDragging ? "border-mystic/40 bg-mystic/5 opacity-60 z-50" : "border-crystal hover:border-crystal-light",
        isIndispensable && "border-l-2 border-l-mystic/40",
      )}
    >
      <span className="text-[10px] text-silk/20 w-4 text-center shrink-0">{index + 1}</span>
      <button {...attributes} {...listeners}
        className="text-silk/20 hover:text-silk/50 cursor-grab active:cursor-grabbing shrink-0 touch-none">
        <GripVertical size={12} />
      </button>
      <AgentAvatar colors={agent.colors as [string,string]} name={agent.name} size={24} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-silk truncate">{agent.name}</p>
          {isIndispensable && <span className="text-[9px] text-mystic/60 font-medium shrink-0">★</span>}
        </div>
        <p className="text-[10px] text-silk/35 truncate italic">{proposedAgent.reason}</p>
      </div>
      <span className="text-[9px] px-1.5 py-0.5 rounded-md font-medium shrink-0"
        style={{ color: tierColor, backgroundColor: `${tierColor}18`, border: `1px solid ${tierColor}30` }}>
        {MODEL_LABELS[agent.model as keyof typeof MODEL_LABELS]}
      </span>
      {!isIndispensable && (
        <button onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md flex items-center justify-center text-silk/25 hover:text-danger hover:bg-danger/10 transition-all shrink-0">
          <X size={10} />
        </button>
      )}
    </div>
  );
}
