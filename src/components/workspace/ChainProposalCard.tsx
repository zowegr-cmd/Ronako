import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, X, Plus, GripVertical, ChevronDown, ChevronUp,
  Sparkles, RotateCcw,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/Button";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { MODEL_LABELS, MODEL_TIER_COLOR } from "@/types";
import { useAgentStore } from "@/store/agentStore";
import type { Agent, ChainProposal, ProposedAgent } from "@/types";
import { cn } from "@/lib/utils";

interface ChainProposalCardProps {
  proposal: ChainProposal;
  onConfirm: (brief: string, agentIds: string[]) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ChainProposalCard({
  proposal,
  onConfirm,
  onCancel,
  loading,
}: ChainProposalCardProps) {
  const { agents, getAgent } = useAgentStore();
  const [selectedAgents, setSelectedAgents] = useState<ProposedAgent[]>(proposal.agents);
  const [showAvailable, setShowAvailable] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const availableAgents = agents.filter(
    (a) => !a.isSystem && !selectedAgents.find((s) => s.id === a.id)
  );

  const handleDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const oldIdx = selectedAgents.findIndex((a) => a.id === active.id);
    const newIdx = selectedAgents.findIndex((a) => a.id === over.id);
    setSelectedAgents(arrayMove(selectedAgents, oldIdx, newIdx));
  };

  const removeAgent = (id: string) =>
    setSelectedAgents((s) => s.filter((a) => a.id !== id));

  const addAgent = (id: string) => {
    const agentDef = agents.find((a) => a.id === id);
    if (!agentDef) return;
    setSelectedAgents((s) => [...s, { id, reason: agentDef.role }]);
    setShowAvailable(false);
  };

  const reset = () => setSelectedAgents(proposal.agents);

  const handleConfirm = () =>
    onConfirm(proposal.brief, selectedAgents.map((a) => a.id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 360, damping: 30 }}
      className="mx-4 mb-3 rounded-2xl border border-mystic/30 bg-graphite overflow-hidden shadow-glow-mystic"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-crystal/50 bg-mystic/5">
        <Sparkles size={14} className="text-mystic shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-silk">Proposition de Marcus</p>
          <p className="text-[11px] text-silk/40 truncate">{proposal.brief}</p>
        </div>
        <button
          onClick={onCancel}
          className="text-silk/25 hover:text-silk/60 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Brief résumé complet */}
      <div className="px-4 py-2.5 border-b border-crystal/30 bg-graphite-light/40">
        <p className="text-xs text-silk/65 leading-relaxed">{proposal.brief}</p>
      </div>

      {/* Agent list (draggable) */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-silk/35 uppercase tracking-widest">
            Chaîne — {selectedAgents.length} agent{selectedAgents.length > 1 ? "s" : ""}
          </p>
          <button
            onClick={reset}
            className="text-[10px] text-silk/25 hover:text-silk/60 flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={9} /> Réinitialiser
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={selectedAgents.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
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
                    onRemove={() => removeAgent(pa.id)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {/* Ajouter un agent */}
        <div className="mt-2">
          <button
            onClick={() => setShowAvailable(!showAvailable)}
            className="flex items-center gap-1.5 text-[11px] text-silk/30 hover:text-electric/70 transition-colors"
            disabled={availableAgents.length === 0}
          >
            <Plus size={11} />
            Ajouter un agent
            {availableAgents.length > 0 && (
              <span className="text-silk/20">({availableAgents.length} disponibles)</span>
            )}
            {showAvailable ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          <AnimatePresence>
            {showAvailable && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-1.5 flex flex-col gap-1 overflow-hidden"
              >
                {availableAgents.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => addAgent(a.id)}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-crystal hover:border-electric/30 hover:bg-electric/5 transition-all text-left group"
                  >
                    <AgentAvatar colors={a.colors} name={a.name} size={22} />
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

      {/* Actions */}
      <div className="flex gap-2 px-4 py-3 border-t border-crystal/50">
        <Button variant="ghost" size="sm" onClick={onCancel} className="flex-1">
          Modifier le brief
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleConfirm}
          loading={loading}
          disabled={selectedAgents.length === 0 || loading}
          className="flex-1"
        >
          <Zap size={12} />
          Lancer {selectedAgents.length} agent{selectedAgents.length > 1 ? "s" : ""}
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Row d'un agent dans la proposition ──────────────────────────────────────

function ProposalAgentRow({
  proposedAgent,
  agent,
  index,
  onRemove,
}: {
  proposedAgent: ProposedAgent;
  agent: Agent;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: proposedAgent.id });

  const tierColor = MODEL_TIER_COLOR[agent.model as keyof typeof MODEL_TIER_COLOR];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border group transition-all",
        isDragging ? "border-mystic/40 bg-mystic/5 opacity-60 z-50" : "border-crystal hover:border-crystal-light",
      )}
    >
      <span className="text-[10px] text-silk/20 w-4 text-center shrink-0">{index + 1}</span>
      <button
        {...attributes}
        {...listeners}
        className="text-silk/20 hover:text-silk/50 cursor-grab active:cursor-grabbing shrink-0 touch-none"
      >
        <GripVertical size={12} />
      </button>
      <AgentAvatar colors={agent.colors} name={agent.name} size={24} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-silk truncate">{agent.name}</p>
        <p className="text-[10px] text-silk/35 truncate italic">{proposedAgent.reason}</p>
      </div>
      <span
        className="text-[9px] px-1.5 py-0.5 rounded-md font-medium shrink-0"
        style={{ color: tierColor, backgroundColor: `${tierColor}18`, border: `1px solid ${tierColor}30` }}
      >
        {MODEL_LABELS[agent.model as keyof typeof MODEL_LABELS]}
      </span>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md flex items-center justify-center text-silk/25 hover:text-danger hover:bg-danger/10 transition-all shrink-0"
      >
        <X size={10} />
      </button>
    </div>
  );
}
