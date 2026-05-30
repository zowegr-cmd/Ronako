import { motion } from "framer-motion";
import type { Agent } from "@/types";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { cn } from "@/lib/utils";
import { useChainStore } from "@/store/chainStore";

interface AgentFlowVizProps {
  agents: Agent[];
  currentIndex: number;
  isRunning: boolean;
}

export function AgentFlowViz({ agents, currentIndex, isRunning }: AgentFlowVizProps) {
  const { relayActive, relayForAgentId } = useChainStore();
  const visible = agents.slice(0, 6);

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1 scrollbar-none">
      {visible.map((agent, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex && isRunning;
        const isPending = i > currentIndex;
        // Relay est actif entre l'agent courant et le suivant
        const relayBetween = relayActive && relayForAgentId === agent.id && i > 0;

        return (
          <div key={agent.id} className="flex items-center shrink-0">
            {/* Relay node entre agents */}
            {i > 0 && (
              <RelayFlowNode
                active={relayBetween}
                done={isDone}
                running={isRunning && i === currentIndex + 1 && !relayBetween}
              />
            )}

            {/* Agent node */}
            <div className="flex flex-col items-center gap-1 relative">
              <motion.div
                animate={{
                  opacity: isPending && isRunning ? 0.35 : 1,
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
              >
                <AgentAvatar colors={agent.colors as [string,string]} name={agent.name} size={28} pulse={isActive} />
              </motion.div>
              <span className={cn(
                "text-[9px] font-medium transition-colors duration-300",
                isActive ? "text-electric" : isDone ? "text-success" : "text-silk/25",
              )}>
                {agent.name}
              </span>

              {isDone && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success flex items-center justify-center"
                >
                  <span className="text-white text-[7px] font-bold">✓</span>
                </motion.div>
              )}
            </div>
          </div>
        );
      })}

      {agents.length > 6 && (
        <span className="text-xs text-silk/25 ml-2">+{agents.length - 6}</span>
      )}
    </div>
  );
}

// ─── Nœud Relay entre deux agents ────────────────────────────────────────────
function RelayFlowNode({
  active,
  done,
  running,
}: {
  active: boolean;
  done: boolean;
  running: boolean;
}) {
  return (
    <div className="flex items-center mx-1 mt-[-10px]" title="Relay — Distillation du contexte">
      {/* Ligne gauche */}
      <div className={cn("w-3 h-0.5 rounded-full", done ? "bg-success/40" : "bg-crystal")} />

      {/* Losange Relay */}
      <motion.div
        animate={active ? { scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] } : {}}
        transition={active ? { duration: 1, repeat: Infinity } : {}}
        className={cn(
          "w-3 h-3 rotate-45 border flex items-center justify-center",
          "transition-all duration-300",
          active
            ? "bg-mystic/30 border-mystic/60 shadow-[0_0_8px_rgba(162,89,255,0.5)]"
            : done
            ? "bg-success/20 border-success/30"
            : "bg-crystal/50 border-crystal",
        )}
      >
        {/* Particule interne quand actif */}
        {active && (
          <motion.div
            className="w-1 h-1 rounded-full bg-mystic -rotate-45"
            animate={{ scale: [0.5, 1, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* Ligne droite */}
      <div className={cn("w-3 h-0.5 rounded-full", done ? "bg-success/40" : "bg-crystal")}>
        {/* Flux énergétique quand running vers cet agent */}
        {running && (
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-transparent via-electric to-transparent"
            initial={{ x: -12 }}
            animate={{ x: 12 }}
            transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
          />
        )}
      </div>
    </div>
  );
}
