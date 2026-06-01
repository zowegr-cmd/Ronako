import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  GitFork, ChefHat, Zap, TrendingUp, Plus, Pencil,
  Check, ChevronDown, LayoutGrid, Sparkles, Wand2, Trash2,
} from "lucide-react";
import { AgentChainItem } from "@/components/agents/AgentChainItem";
import { AgentCard } from "@/components/agents/AgentCard";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { useAgentStore } from "@/store/agentStore";
import { useProjectStore } from "@/store/projectStore";
import { useChainStore } from "@/store/chainStore";
import { TEAM_TEMPLATES } from "@/lib/agents/defaultTeam";
import { enforceIndispensable, useChainOptimizer } from "@/hooks/useChainOptimizer";
import type { Agent } from "@/types";
import { cn, formatCost } from "@/lib/utils";
import { estimateChainCost } from "@/lib/tokenCounter";

export function Orchestrator() {
  const { getActiveProject, updateProject } = useProjectStore();
  const { agents, teams, getTeam, updateTeam, addTeam, deleteTeam } = useAgentStore();
  const { run, workspaceMessages, relayActive, relayForAgentId } = useChainStore();
  const project = getActiveProject();
  const teamId = project?.teamId ?? "alpha";
  const team = getTeam(teamId);
  const chainAgentIds = team?.agentIds ?? [];
  const chainAgents = chainAgentIds.map((id) => agents.find((a) => a.id === id)).filter(Boolean) as Agent[];
  const availableAgents = agents.filter((a) => !a.isSystem && !chainAgentIds.includes(a.id));

  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(team?.name ?? "");
  const [optimizeMsg, setOptimizeMsg] = useState<string | null>(null);
  const isRunning = run.status === "running";
  const { optimize, optimizing } = useChainOptimizer();
  const allAgentIds = new Set(agents.map((a) => a.id));

  // Agents indispensables manquants dans la chaîne actuelle
  const currentProposed = chainAgentIds.map((id) => ({ id, reason: "" }));
  const { added: missingIndispensable } = enforceIndispensable(currentProposed, allAgentIds);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const oldIdx = chainAgentIds.indexOf(String(active.id));
    const newIdx = chainAgentIds.indexOf(String(over.id));
    updateTeam(teamId, { agentIds: arrayMove(chainAgentIds, oldIdx, newIdx) });
    document.dispatchEvent(new Event("tour-dnd-moved"));
  };

  const addToChain = (agentId: string) =>
    updateTeam(teamId, { agentIds: [...chainAgentIds, agentId] });

  const removeFromChain = (agentId: string) =>
    updateTeam(teamId, { agentIds: chainAgentIds.filter((id) => id !== agentId) });

  const toggleChef = (v: boolean) => updateTeam(teamId, { enableChefOption: v });

  const switchTeam = (id: string) => {
    if (project) updateProject(project.id, { teamId: id });
    setShowTeamPicker(false);
  };

  const createFromTemplate = (tpl: typeof TEAM_TEMPLATES[number]) => {
    const newTeam = addTeam({ name: tpl.name, agentIds: tpl.agentIds, enableChefOption: tpl.enableChefOption });
    if (project) updateProject(project.id, { teamId: newTeam.id });
    setShowTemplates(false);
  };

  const saveName = () => {
    if (newName.trim()) updateTeam(teamId, { name: newName.trim() });
    setEditingName(false);
  };

  // ── Auto-compléter avec les agents indispensables ─────────────────
  const handleAutoComplete = () => {
    const { result } = enforceIndispensable(currentProposed, allAgentIds);
    const newIds = result.map((a) => a.id);
    updateTeam(teamId, { agentIds: newIds });
    setOptimizeMsg(`Agents indispensables ajoutés : ${missingIndispensable.join(", ")}`);
    setTimeout(() => setOptimizeMsg(null), 4000);
  };

  // ── Optimiser l'ordre via IA ──────────────────────────────────────
  const handleOptimize = async () => {
    if (chainAgents.length < 2) return;
    setOptimizeMsg(null);
    const brief = workspaceMessages
      .filter((m) => m.role === "user")
      .slice(-3)
      .map((m) => m.content)
      .join("\n") || `Optimise la chaîne "${team?.name ?? "équipe"}" pour un résultat optimal.`;
    const result = await optimize(currentProposed, brief);
    if (result) {
      updateTeam(teamId, { agentIds: result.proposal.agents.map((a) => a.id) });
      setOptimizeMsg(result.changes);
      setTimeout(() => setOptimizeMsg(null), 6000);
    }
  };

  const estimatedCost = estimateChainCost(chainAgents, 500);

  return (
    <div className="flex h-full">
      {/* Colonne principale — chaîne */}
      <div className="flex-1 flex flex-col border-r border-crystal/50 overflow-hidden">

        {/* Header avec sélecteur d'équipe */}
        <div className="px-5 pt-4 pb-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Nom de l'équipe éditable */}
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                    className="bg-graphite-light border border-electric/40 rounded-lg px-2 py-1 text-sm font-semibold text-silk focus:outline-none"
                  />
                  <button onClick={saveName} className="w-6 h-6 rounded-md bg-electric/15 text-electric flex items-center justify-center">
                    <Check size={11} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowTeamPicker(!showTeamPicker)}
                  className="flex items-center gap-2 group"
                >
                  <h1 className="text-base font-bold text-silk group-hover:text-electric transition-colors">
                    {team?.name ?? "Équipe"}
                  </h1>
                  <ChevronDown size={14} className={cn("text-silk/30 transition-transform", showTeamPicker && "rotate-180")} />
                </button>
              )}
              <p className="text-xs text-silk/35 mt-0.5">{chainAgents.length} agents</p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              <div className="flex items-center gap-1 px-2.5 py-1.5 bg-graphite border border-crystal rounded-xl">
                <TrendingUp size={11} className="text-silk/30" />
                <span className="text-[11px] text-silk/50">~{formatCost(estimatedCost)}</span>
              </div>
              <button
                onClick={() => setEditingName(true)}
                title="Renommer"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/25 hover:text-silk/60 hover:bg-crystal transition-all"
              >
                <Pencil size={12} />
              </button>
              {/* Auto-compléter les agents indispensables */}
              {missingIndispensable.length > 0 && (
                <Button variant="glass" size="sm" onClick={handleAutoComplete} title={`Ajouter : ${missingIndispensable.join(", ")}`}>
                  <Sparkles size={12} /> Compléter ★
                </Button>
              )}
              {/* Optimiser l'ordre via IA */}
              {chainAgents.length >= 2 && (
                <Button variant="mystic" size="sm" onClick={handleOptimize} loading={optimizing}>
                  <Wand2 size={12} /> {optimizing ? "Optimisation…" : "Optimiser"}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowTemplates(true)}>
                <LayoutGrid size={12} /> Templates
              </Button>
              <Button variant="primary" size="sm" onClick={() => {
                // Marcus toujours inclus par défaut dans une nouvelle équipe
                const t = addTeam({ name: "Nouvelle équipe", agentIds: ["marcus"], enableChefOption: false });
                if (project) updateProject(project.id, { teamId: t.id });
              }}>
                <Plus size={12} />
              </Button>
            </div>
          </div>

          {/* Feedback optimisation */}
          <AnimatePresence>
            {optimizeMsg && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 px-3 py-2 bg-success/8 border border-success/20 rounded-xl"
              >
                <p className="text-[11px] text-success/70 leading-relaxed">{optimizeMsg}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dropdown sélecteur équipe */}
          <AnimatePresence>
            {showTeamPicker && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-2 bg-graphite border border-crystal rounded-xl overflow-hidden shadow-xl z-20 relative"
              >
                {teams.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "flex items-center group transition-colors",
                      t.id === teamId ? "bg-electric/10" : "hover:bg-graphite-light",
                    )}
                  >
                    <button
                      onClick={() => switchTeam(t.id)}
                      className={cn(
                        "flex-1 flex items-center justify-between px-3 py-2 text-sm text-left",
                        t.id === teamId ? "text-electric" : "text-silk/70",
                      )}
                    >
                      <span className="font-medium">{t.name}</span>
                      <span className="text-xs text-silk/30">{t.agentIds.length} agents</span>
                    </button>
                    {/* Supprimer — masqué pour l'équipe alpha et l'équipe active */}
                    {t.id !== "alpha" && (
                      <button
                        onClick={() => {
                          // Si on supprime l'équipe active → revenir sur alpha
                          if (t.id === teamId) switchTeam("alpha");
                          deleteTeam(t.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 w-8 h-full flex items-center justify-center text-silk/25 hover:text-danger transition-all shrink-0 pr-2"
                        title="Supprimer l'équipe"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chaîne DnD */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {chainAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
              <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-crystal flex items-center justify-center">
                <GitFork size={18} className="text-silk/20" />
              </div>
              <p className="text-sm text-silk/35">Chaîne vide</p>
              <p className="text-xs text-silk/20">Ajoutez des agents depuis le panneau de droite</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={chainAgentIds} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1" data-tour="chain-dnd">
                  {chainAgents.map((agent, i) => (
                    <div key={agent.id}>
                      <AgentChainItem
                        agent={agent}
                        index={i}
                        onRemove={removeFromChain}
                        isActive={isRunning && run.currentAgentIndex === i}
                      />
                      {/* Nœud Relay visible entre chaque agent */}
                      {i < chainAgents.length - 1 && (
                        <div {...(i === 0 ? { "data-tour": "relay-indicator" } : {})}>
                          <OrchestratorRelayNode
                            active={relayActive && relayForAgentId === chainAgents[i + 1]?.id}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Option Chef */}
          {chainAgents.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mt-3 flex items-center gap-3 p-3 bg-graphite border border-crystal/50 rounded-xl border-dashed"
            >
              <div className="w-8 h-8 rounded-xl bg-mystic/10 border border-mystic/20 flex items-center justify-center shrink-0">
                <ChefHat size={14} className="text-mystic" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-silk">Option Chef</p>
                <p className="text-[10px] text-silk/30">Pause pour validation manuelle avant livraison</p>
              </div>
              <Toggle checked={team?.enableChefOption ?? false} onChange={toggleChef} size="sm" color="mystic" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Agents disponibles */}
      <div className="w-64 flex flex-col overflow-hidden shrink-0">
        <div className="px-4 pt-4 pb-3 shrink-0">
          <p className="text-xs font-medium text-silk/40 uppercase tracking-widest">Disponibles</p>
          <p className="text-[10px] text-silk/20 mt-0.5">{availableAgents.length} non assignés</p>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="flex flex-col gap-2">
            {availableAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} selectable onSelect={addToChain} />
            ))}
            {availableAgents.length === 0 && (
              <div className="text-center py-8">
                <Zap size={16} className="mx-auto text-silk/15 mb-2" />
                <p className="text-xs text-silk/20">Tous les agents sont en chaîne</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal templates */}
      <Modal open={showTemplates} onClose={() => setShowTemplates(false)} title="Templates d'équipes" size="md">
        <div className="flex flex-col gap-2">
          {TEAM_TEMPLATES.map((tpl, i) => (
            <button
              key={i}
              onClick={() => createFromTemplate(tpl)}
              className="flex items-start gap-3 p-3 rounded-xl border border-crystal hover:border-electric/30 hover:bg-electric/5 transition-all text-left group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-silk group-hover:text-electric transition-colors">{tpl.name}</p>
                <p className="text-xs text-silk/40 mt-0.5">{tpl.description}</p>
                <p className="text-[10px] text-silk/25 mt-1">{tpl.agentIds.length} agents · {tpl.enableChefOption ? "Option Chef" : "Livraison auto"}</p>
              </div>
              <Plus size={14} className="text-silk/20 group-hover:text-electric/60 mt-0.5 shrink-0" />
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

// ─── Nœud Relay dans l'Orchestrateur ─────────────────────────────────────────
function OrchestratorRelayNode({ active }: { active: boolean }) {
  return (
    <div
      className="flex items-center gap-2 py-0.5 pl-[52px] select-none"
      title="Relay — Agent système de distillation de contexte. Réduit les coûts de 60-80%. Non modifiable."
    >
      {/* Ligne verticale gauche */}
      <div className="w-px h-3 bg-crystal/50 ml-[1px]" />

      {/* Losange + label */}
      <div className="flex items-center gap-1.5">
        <motion.div
          animate={active ? { rotate: [45, 45], scale: [1, 1.25, 1] } : {}}
          transition={active ? { duration: 0.8, repeat: Infinity } : {}}
          className={cn(
            "w-2.5 h-2.5 rotate-45 border transition-all",
            active
              ? "bg-mystic/30 border-mystic/60 shadow-[0_0_6px_rgba(162,89,255,0.5)]"
              : "bg-crystal/50 border-crystal",
          )}
        />
        <span className={cn(
          "text-[9px] font-mono tracking-wider transition-colors",
          active ? "text-mystic/70" : "text-silk/20",
        )}>
          {active ? "RELAY…" : "⟡ RELAY"}
        </span>
        <span className="text-[9px] text-silk/15 bg-crystal/30 px-1 rounded font-mono">SYS</span>
      </div>

      {/* Ligne verticale droite */}
      <div className="w-px h-3 bg-crystal/50" />
    </div>
  );
}
