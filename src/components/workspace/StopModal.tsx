import { motion, AnimatePresence } from "framer-motion";
import { PauseCircle, StopCircle } from "lucide-react";

interface StopModalProps {
  open: boolean;
  currentAgentName: string;
  onPause: () => void;
  onStop: () => void;
  onCancel: () => void;
}

export function StopModal({ open, currentAgentName, onPause, onStop, onCancel }: StopModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="stop-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
          <motion.div key="stop-modal"
            initial={{ opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto bg-graphite border border-crystal rounded-2xl shadow-2xl overflow-hidden" style={{ width: 340 }}>
              <div className="px-5 py-4 border-b border-crystal">
                <p className="text-sm font-semibold text-silk">Arrêter la chaîne ?</p>
                <p className="text-[11px] text-silk/40 mt-0.5">{currentAgentName} est en cours d'exécution</p>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <button onClick={onPause}
                  className="flex items-center gap-3 p-3 rounded-xl border border-crystal hover:border-electric/40 hover:bg-electric/5 transition-all text-left group">
                  <PauseCircle size={18} className="text-electric/60 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-silk">Pause après cet agent</p>
                    <p className="text-[11px] text-silk/40">{currentAgentName} termine, puis la chaîne s'arrête</p>
                  </div>
                </button>
                <button onClick={onStop}
                  className="flex items-center gap-3 p-3 rounded-xl border border-danger/20 hover:border-danger/40 hover:bg-danger/5 transition-all text-left group">
                  <StopCircle size={18} className="text-danger/60 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-danger/80">Arrêt immédiat</p>
                    <p className="text-[11px] text-silk/40">Sauvegarde les outputs déjà produits</p>
                  </div>
                </button>
                <button onClick={onCancel} className="text-xs text-silk/30 hover:text-silk/60 transition-colors text-center py-1">
                  Annuler
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
