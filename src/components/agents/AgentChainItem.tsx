import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { useSounds } from "@/hooks/useSounds";
import type { Agent } from "@/types";
import { AgentAvatar } from "./AgentAvatar";
import { Badge } from "@/components/ui/Badge";
import { MODEL_LABELS, MODEL_TIER_COLOR } from "@/types";
import { cn } from "@/lib/utils";

interface AgentChainItemProps {
  agent: Agent;
  index: number;
  onRemove: (id: string) => void;
  isActive?: boolean;
}

export function AgentChainItem({ agent, index, onRemove, isActive }: AgentChainItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: agent.id });
  const { playClick } = useSounds();

  // Son au début du drag
  const handlePointerDown = (e: React.PointerEvent) => {
    playClick();
    (listeners as { onPointerDown?: (e: React.PointerEvent) => void })?.onPointerDown?.(e);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 bg-graphite border rounded-xl px-3 py-2.5 group",
        "transition-all duration-200 select-none",
        isDragging ? "opacity-50 border-mystic/50 shadow-glow-mystic z-50" : "border-crystal",
        isActive && "border-electric/40 bg-electric/5",
      )}
    >
      {/* Index */}
      <span className="w-5 text-center text-xs font-bold text-silk/20 shrink-0">
        {index + 1}
      </span>

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        onPointerDown={handlePointerDown}
        className="text-silk/20 hover:text-silk/60 transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none"
      >
        <GripVertical size={14} />
      </button>

      {/* Avatar */}
      <AgentAvatar colors={agent.colors} name={agent.name} size={32} pulse={isActive} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-silk truncate">{agent.name}</p>
        <p className="text-[10px] text-silk/35 truncate">{agent.role}</p>
      </div>

      {/* Model badge */}
      <Badge
        variant="ghost"
        className="text-[10px] shrink-0"
        style={{
          color: MODEL_TIER_COLOR[agent.model],
          borderColor: `${MODEL_TIER_COLOR[agent.model]}40`,
          backgroundColor: `${MODEL_TIER_COLOR[agent.model]}15`,
        }}
      >
        {MODEL_LABELS[agent.model]}
      </Badge>

      {/* Remove */}
      <button
        onClick={() => onRemove(agent.id)}
        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-silk/30 hover:text-danger hover:bg-danger/10 transition-all shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}
