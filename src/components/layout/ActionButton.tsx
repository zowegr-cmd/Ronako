import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { ACTION_CONFIG, executeAction } from "@/lib/consultantActions";
import type { ConsultantAction } from "@/lib/consultantActions";
import { cn } from "@/lib/utils";

interface ActionButtonProps {
  action: ConsultantAction;
  onExecuted?: () => void;
}

export function ActionButton({ action, onExecuted }: ActionButtonProps) {
  const [state, setState] = useState<"idle" | "confirm" | "loading" | "done">("idle");
  const cfg = ACTION_CONFIG[action.type] ?? { color: "#6B7280", icon: "⚡" };

  const handleClick = async () => {
    if (state === "done" || state === "loading") return;

    if (action.confirmRequired && state !== "confirm") {
      setState("confirm");
      return;
    }

    setState("loading");
    try {
      await executeAction(action);
      setState("done");
      onExecuted?.();
    } catch {
      setState("idle");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="mt-2"
    >
      <AnimatePresence mode="wait">
        {state === "confirm" ? (
          <motion.div key="confirm"
            initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-2.5 rounded-xl border"
            style={{ borderColor: `${cfg.color}30`, backgroundColor: `${cfg.color}08` }}
          >
            <span className="text-xs text-silk/60 flex-1">
              Confirmer : {action.label} ?
            </span>
            <button onClick={handleClick}
              className="text-xs font-medium px-2.5 py-1 rounded-lg text-white"
              style={{ backgroundColor: cfg.color }}>
              Oui
            </button>
            <button onClick={() => setState("idle")}
              className="text-xs text-silk/40 hover:text-silk/70 px-2 py-1 rounded-lg transition-colors">
              Non
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="btn"
            initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            onClick={handleClick}
            disabled={state === "loading" || state === "done"}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
              state === "done" ? "opacity-60 cursor-default" : "hover:opacity-90 cursor-pointer",
            )}
            style={{
              borderColor: `${cfg.color}40`,
              backgroundColor: `${cfg.color}12`,
              color: cfg.color,
            }}
          >
            {state === "loading" ? (
              <Loader2 size={12} className="animate-spin shrink-0" />
            ) : state === "done" ? (
              <Check size={12} className="shrink-0" />
            ) : (
              <span className="shrink-0">{cfg.icon}</span>
            )}
            <span>{state === "done" ? "Appliqué ✓" : action.label}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
