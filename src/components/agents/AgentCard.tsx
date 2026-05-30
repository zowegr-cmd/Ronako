import { motion } from "framer-motion";
import { Pencil, Trash2, Wrench, MessageSquare } from "lucide-react";
import { useAgentChat } from "./AgentChatModal";
import { cn } from "@/lib/utils";
import type { Agent } from "@/types";
import { MODEL_LABELS, MODEL_TIER_COLOR } from "@/types";
import { AgentAvatar } from "./AgentAvatar";
import { Badge } from "@/components/ui/Badge";

interface AgentCardProps {
  agent: Agent;
  isActive?: boolean;
  chainRunning?: boolean;
  onEdit?: (agent: Agent) => void;
  onDelete?: (id: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function AgentCard({
  agent,
  isActive,
  chainRunning,
  onEdit,
  onDelete,
  selectable,
  selected,
  onSelect,
}: AgentCardProps) {
  const tierColor = MODEL_TIER_COLOR[agent.model];

  return (
    <motion.div
      layout
      animate={{
        opacity: chainRunning && !isActive ? 0.3 : 1,
        scale: isActive ? 1.02 : 1,
      }}
      transition={{ duration: 0.4 }}
      onClick={selectable ? () => onSelect?.(agent.id) : undefined}
      className={cn(
        "relative group bg-graphite border rounded-2xl p-4 transition-all duration-200",
        "flex flex-col gap-3 overflow-hidden",
        selected ? "border-mystic/50 shadow-glow-mystic" : "border-crystal",
        isActive && "border-electric/50 shadow-glow-electric",
        selectable && "cursor-pointer hover:border-crystal-light",
        !selectable && "hover:border-crystal-light",
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <motion.div
          layoutId="active-bar"
          className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-electric to-mystic rounded-t-2xl"
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <AgentAvatar
            colors={agent.colors}
            name={agent.name}
            size={42}
            pulse={isActive}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-silk truncate">{agent.name}</p>
            <p className="text-xs text-silk/40 truncate">{agent.role}</p>
          </div>
        </div>

        {/* Actions (hover) */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); useAgentChat.getState().openChat(agent); }}
            title="Discuter"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/40 hover:text-electric hover:bg-electric/10 transition-all"
          >
            <MessageSquare size={12} />
          </button>
          {!agent.isSystem && onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(agent); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/40 hover:text-silk hover:bg-crystal transition-all"
            >
              <Pencil size={12} />
            </button>
          )}
          {!agent.isSystem && onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(agent.id); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/40 hover:text-danger hover:bg-danger/10 transition-all"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-silk/40 leading-relaxed line-clamp-2">{agent.description}</p>

      {/* Footer badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge
          variant="ghost"
          className="text-[10px]"
          style={{ color: tierColor, borderColor: `${tierColor}40`, backgroundColor: `${tierColor}15` }}
        >
          {MODEL_LABELS[agent.model]}
        </Badge>

        <Badge variant="ghost" className="text-[10px]">
          {agent.temperature}%
        </Badge>

        {agent.tools.length > 0 && (
          <Badge variant="ghost" className="text-[10px] gap-1">
            <Wrench size={9} />
            {agent.tools.length}
          </Badge>
        )}

        {agent.isSystem && (
          <Badge variant="mystic" className="text-[10px]">Système</Badge>
        )}
      </div>

      {/* Selection overlay */}
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-mystic flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">✓</span>
        </div>
      )}
    </motion.div>
  );
}
