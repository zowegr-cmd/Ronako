import { motion } from "framer-motion";
import type { Agent } from "@/types";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { cn } from "@/lib/utils";

interface AgentFlowVizProps {
  agents: Agent[];
  currentIndex: number;
  isRunning: boolean;
}

export function AgentFlowViz({ agents, currentIndex, isRunning }: AgentFlowVizProps) {
  const visible = agents.slice(0, 8);

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1 scrollbar-none">
      {visible.map((agent, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex && isRunning;
        const isPending = i > currentIndex;

        return (
          <div key={agent.id} className="flex items-center shrink-0">
            {/* Agent node */}
            <div className="flex flex-col items-center gap-1 relative">
              <motion.div
                animate={{
                  opacity: isPending && isRunning ? 0.35 : 1,
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
              >
                <AgentAvatar
                  colors={agent.colors}
                  name={agent.name}
                  size={28}
                  pulse={isActive}
                />
              </motion.div>
              <span
                className={cn(
                  "text-[9px] font-medium transition-colors duration-300",
                  isActive ? "text-electric" : isDone ? "text-success" : "text-silk/25",
                )}
              >
                {agent.name}
              </span>

              {/* Done checkmark */}
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

            {/* Connector line */}
            {i < visible.length - 1 && (
              <FlowConnector active={i < currentIndex} flowing={i === currentIndex - 1 && isRunning} />
            )}
          </div>
        );
      })}

      {agents.length > 8 && (
        <span className="text-xs text-silk/25 ml-2">+{agents.length - 8}</span>
      )}
    </div>
  );
}

function FlowConnector({ active, flowing }: { active: boolean; flowing: boolean }) {
  return (
    <div className="relative w-8 h-0.5 mx-0.5 mt-[-10px] overflow-hidden rounded-full">
      {/* Base line */}
      <div className={cn("absolute inset-0 rounded-full", active ? "bg-success/40" : "bg-crystal")} />

      {/* Flowing energy particle */}
      {flowing && (
        <motion.div
          className="absolute inset-y-0 w-4 rounded-full bg-gradient-to-r from-transparent via-electric to-transparent"
          initial={{ x: -16 }}
          animate={{ x: 32 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  );
}
