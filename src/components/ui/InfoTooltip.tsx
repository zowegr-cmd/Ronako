import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right" | "auto";
  className?: string;
  size?: number;
}

export function InfoTooltip({
  title,
  description,
  position = "auto",
  className,
  size = 12,
}: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<"top" | "bottom" | "left" | "right">("top");
  const ref = useRef<HTMLButtonElement>(null);

  const computePosition = () => {
    if (position !== "auto") { setPos(position); return; }
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    setPos(spaceAbove > 120 ? "top" : spaceBelow > 120 ? "bottom" : "top");
  };

  const TOOLTIP_VARIANTS = {
    top:    { initial: { opacity: 0, y: 4 },  animate: { opacity: 1, y: 0 } },
    bottom: { initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 } },
    left:   { initial: { opacity: 0, x: 4 },  animate: { opacity: 1, x: 0 } },
    right:  { initial: { opacity: 0, x: -4 }, animate: { opacity: 1, x: 0 } },
  };

  const TOOLTIP_POSITION: Record<string, string> = {
    top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left:   "right-full top-1/2 -translate-y-1/2 mr-2",
    right:  "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <button
        ref={ref}
        type="button"
        onMouseEnter={() => { computePosition(); setVisible(true); }}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => { computePosition(); setVisible(true); }}
        onBlur={() => setVisible(false)}
        className="inline-flex items-center justify-center text-silk/30 hover:text-silk/60 transition-colors focus:outline-none"
        aria-label={`Info: ${title}`}
      >
        <Info size={size} />
      </button>

      <AnimatePresence>
        {visible && (
          <motion.div
            key="tooltip"
            initial={TOOLTIP_VARIANTS[pos].initial}
            animate={TOOLTIP_VARIANTS[pos].animate}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "absolute z-[200] w-52 pointer-events-none",
              TOOLTIP_POSITION[pos],
            )}
          >
            <div className="bg-graphite border border-crystal rounded-xl shadow-2xl p-3">
              <p className="text-xs font-semibold text-silk mb-1">{title}</p>
              <p className="text-[11px] text-silk/55 leading-relaxed">{description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
