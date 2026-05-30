import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Command } from "lucide-react";

const SHORTCUTS = [
  { keys: ["⌘", "1"], label: "Workspace" },
  { keys: ["⌘", "2"], label: "Agent Studio" },
  { keys: ["⌘", "3"], label: "Orchestrateur" },
  { keys: ["⌘", "4"], label: "Paramètres" },
  null, // séparateur
  { keys: ["⌘", "↵"], label: "Envoyer à Marcus" },
  { keys: ["⌘", "L"], label: "Lancer la chaîne" },
  { keys: ["⌘", "S"], label: "Arrêter la chaîne" },
  null,
  { keys: ["Esc"], label: "Fermer / Annuler" },
  { keys: ["⌘", "?"], label: "Cette aide" },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    const close = () => setOpen(false);
    document.addEventListener("show-shortcuts", show);
    document.addEventListener("close-modal", close);
    return () => {
      document.removeEventListener("show-shortcuts", show);
      document.removeEventListener("close-modal", close);
    };
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="shortcuts-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            key="shortcuts-panel"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div
              className="pointer-events-auto bg-graphite border border-crystal rounded-2xl shadow-2xl overflow-hidden"
              style={{ width: 320 }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-crystal">
                <div className="flex items-center gap-2">
                  <Command size={14} className="text-silk/40" />
                  <p className="text-sm font-semibold text-silk">Raccourcis clavier</p>
                </div>
                <button onClick={() => setOpen(false)}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-silk/30 hover:text-silk hover:bg-crystal transition-all">
                  <X size={13} />
                </button>
              </div>
              <div className="p-4 flex flex-col gap-1">
                {SHORTCUTS.map((s, i) =>
                  s === null ? (
                    <div key={i} className="my-1.5 h-px bg-crystal/50" />
                  ) : (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-xs text-silk/55">{s.label}</span>
                      <div className="flex items-center gap-1">
                        {s.keys.map((k, j) => (
                          <kbd key={j}
                            className="px-1.5 py-0.5 text-[10px] font-medium text-silk/60 bg-graphite-light border border-crystal rounded-md font-mono">
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
              <div className="px-4 py-2 border-t border-crystal/50">
                <p className="text-[10px] text-silk/25 text-center">
                  ⌘ = Ctrl sur Windows · Désactivés pendant la saisie
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
