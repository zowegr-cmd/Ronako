import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { Tip } from "@/lib/tips";
import { useEffect } from "react";

interface TipBannerProps {
  tip: Tip | null;
  onDismiss: (id: string, permanent: boolean) => void;
}

export function TipBanner({ tip, onDismiss }: TipBannerProps) {
  // Auto-dismiss après 8s si pas d'action
  useEffect(() => {
    if (!tip) return;
    const t = setTimeout(() => onDismiss(tip.id, tip.showOnce), 8000);
    return () => clearTimeout(t);
  }, [tip, onDismiss]);

  return (
    <AnimatePresence>
      {tip && (
        <motion.div
          key={tip.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-20 left-4 z-[200] max-w-xs bg-graphite border border-electric/20 rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-base shrink-0 mt-0.5">💡</span>
              <p className="text-xs text-silk/70 leading-relaxed flex-1 whitespace-pre-line">{tip.message}</p>
              <button
                onClick={() => onDismiss(tip.id, tip.showOnce)}
                className="w-5 h-5 flex items-center justify-center text-silk/25 hover:text-silk/60 transition-colors shrink-0">
                <X size={11} />
              </button>
            </div>
            {tip.action && tip.actionLabel && (
              <div className="flex justify-end pb-1">
                <button
                  onClick={() => {
                    if (tip.action === "save_team") document.dispatchEvent(new CustomEvent("suggest-save-team", { detail: { score: 9 } }));
                    onDismiss(tip.id, false);
                  }}
                  className="text-[10px] font-medium text-electric/80 hover:text-electric border border-electric/30 rounded-lg px-2.5 py-1 transition-all">
                  {tip.actionLabel}
                </button>
              </div>
            )}
          </div>
          {/* Barre de progression auto-dismiss */}
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 8, ease: "linear" }}
            className="h-0.5 bg-electric/30"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
