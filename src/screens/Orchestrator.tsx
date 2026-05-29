import { motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GitFork, ChefHat, Zap, TrendingUp } from "lucide-react";
import { AgentChainItem } from "@/components/agents/AgentChainItem";
import { AgentCard } from "@/components/agents/AgentCard";
import { Toggle } from "@/components/ui/Toggle";
import { useAgentStore } from "@/store/agentStore";
import { useProjectStore } from "@/store/projectStore";
import { useChainStore } from "@/store/chainStore";
import type { Agent } from "@/types";
import { formatCost } from "@/lib/utils";
import { estimateChainCost } from "@/lib/tokenCounter";

export function Orchestrator() {
  const { getActiveProject } = useProjectStore();
  const { agents, getTeam, updateTeam } = useAgentStore();
  const { run } = useChainStore();
  const project = getActiveProject();
  const teamId = project?.teamId ?? "alpha";
  const team = getTeam(teamId);
  const chainAgentIds = team?.agentIds ?? [];
  const chainAgents = chainAgentIds.map((id) => agents.find((a) => a.id === id)).filter(Boolean) as Agent[];
  const availableAgents = agents.filter((a) => !chainAgentIds.includes(a.id));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = chainAgentIds.indexOf(String(active.id));
      const newIndex = chainAgentIds.indexOf(String(over.id));
      updateTeam(teamId, { agentIds: arrayMove(chainAgentIds, oldIndex, newIndex) });
    }
  };

  const addToChain = (agentId: string) => {
    updateTeam(teamId, { agentIds: [...chainAgentIds, agentId] });
  };

  const removeFromChain = (agentId: string) => {
    updateTeam(teamId, { agentIds: chainAgentIds.filter((id) => id !== agentId) });
  };

  const toggleChef = (v: boolean) => updateTeam(teamId, { enableChefOption: v });

  const estimatedCost = estimateChainCost(chainAgents, 500);

  const isRunning = run.status === "running";

  return (
    <div className="flex h-full">
      {/* Left: chain builder */}
      <div className="flex-1 flex flex-col border-r border-crystal/50 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-silk">Orchestrateur</h1>
              <p className="text-xs text-silk/35 mt-0.5">
                {team?.name ?? "Équipe"} · {chainAgents.length} agents en chaîne
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-graphite border border-crystal rounded-xl">
                <TrendingUp size={11} className="text-silk/30" />
                <span className="text-[11px] text-silk/50">~{formatCost(estimatedCost)}</span>
                <span className="text-[10px] text-silk/25">/ run</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chain items (DnD) */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {chainAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
              <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-crystal flex items-center justify-center">
                <GitFork size={18} className="text-silk/20" />
              </div>
              <div>
                <p className="text-sm text-silk/35">Chaîne vide</p>
                <p className="text-xs text-silk/20 mt-0.5">Ajoute des agents depuis le panneau de droite</p>
              </div>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={chainAgentIds} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {chainAgents.map((agent, i) => (
                    <AgentChainItem
                      key={agent.id}
                      agent={agent}
                      index={i}
                      onRemove={removeFromChain}
                      isActive={isRunning && run.currentAgentIndex === i}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Chef option */}
          {chainAgents.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 flex items-center gap-3 p-3 bg-graphite border border-crystal/50 rounded-xl border-dashed"
            >
              <div className="w-8 h-8 rounded-xl bg-mystic/10 border border-mystic/20 flex items-center justify-center shrink-0">
                <ChefHat size={14} className="text-mystic" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-silk">Option Chef</p>
                <p className="text-[10px] text-silk/30">Pause pour validation manuelle avant livraison</p>
              </div>
              <Toggle
                checked={team?.enableChefOption ?? false}
                onChange={toggleChef}
                size="sm"
                color="mystic"
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Right: available agents */}
      <div className="w-64 flex flex-col overflow-hidden shrink-0">
        <div className="px-4 pt-5 pb-3 shrink-0">
          <p className="text-xs font-medium text-silk/40 uppercase tracking-widest">
            Agents disponibles
          </p>
          <p className="text-[10px] text-silk/20 mt-0.5">{availableAgents.length} non assignés</p>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="flex flex-col gap-2">
            {availableAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                selectable
                onSelect={addToChain}
              />
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
    </div>
  );
}
