import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, AlertCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChainStore } from "@/store/chainStore";
import { useConnectorStore } from "@/store/connectorStore";
import { Button } from "@/components/ui/Button";

interface FormatOption {
  id: string;
  label: string;
  icon: string;
  category: "files" | "web" | "content";
  needsE2B?: boolean;
  description: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  // Fichiers (nécessitent E2B)
  { id: "pdf",           label: "Rapport PDF professionnel",    icon: "📄", category: "files",   needsE2B: true,  description: "Mise en page pro, page de garde, KPIs" },
  { id: "excel",         label: "Fichier Excel avec données",   icon: "📊", category: "files",   needsE2B: true,  description: "Onglets, graphiques, tableaux filtrables" },
  { id: "pptx",          label: "Présentation PowerPoint",      icon: "📱", category: "files",   needsE2B: true,  description: "Style BCG/McKinsey, action titles" },
  { id: "word",          label: "Document Word",                icon: "📝", category: "files",   needsE2B: true,  description: "Styles natifs Word, tableaux, plan d'action" },
  // Web & Code
  { id: "html_dashboard",label: "Dashboard HTML interactif",   icon: "🌐", category: "web",    needsE2B: false, description: "Autonome, graphiques plotly, dark mode" },
  { id: "prompt_cc",     label: "Prompt pour Claude Code",      icon: "💻", category: "web",    needsE2B: false, description: "Instructions structurées pour implémenter" },
  // Contenu
  { id: "email_sequence",label: "Séquence emails",              icon: "📧", category: "content", needsE2B: false, description: "Emails prêts à envoyer" },
  { id: "social_posts",  label: "Posts réseaux sociaux",        icon: "📱", category: "content", needsE2B: false, description: "Formats par plateforme" },
  { id: "markdown",      label: "Synthèse Markdown",            icon: "📋", category: "content", needsE2B: false, description: "Document de référence complet" },
];

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  files:   { label: "FICHIERS", icon: "⚡" },
  web:     { label: "WEB & CODE", icon: "🌐" },
  content: { label: "CONTENU", icon: "📝" },
};

interface Props {
  open: boolean;
  onConfirm: (formats: string[]) => void;
  onSkip: () => void;
  hasFolder: boolean;
}

export function FormatSelectorModal({ open, onConfirm, onSkip, hasFolder }: Props) {
  const { selectedFormats, setSelectedFormats } = useChainStore();
  const { getKey, keys } = useConnectorStore();
  const [selected, setSelected] = useState<string[]>(selectedFormats);
  const [dismissed, setDismissed] = useState(false);

  const hasE2B = !!(getKey("e2b") || keys.e2b);
  const hasFileFormat = selected.some((f) => FORMAT_OPTIONS.find((o) => o.id === f)?.needsE2B);
  const showE2BWarning = hasFileFormat && !hasE2B && !dismissed;

  useEffect(() => {
    if (open) {
      // Défaut intelligent basé sur contexte
      if (selectedFormats.length === 0) {
        setSelected([hasFolder ? "prompt_cc" : "markdown"]);
      } else {
        setSelected(selectedFormats);
      }
    }
  }, [open]);

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);

  const handleConfirm = () => {
    const finalFormats = selected.length > 0 ? selected : [hasFolder ? "prompt_cc" : "markdown"];
    setSelectedFormats(finalFormats);
    onConfirm(finalFormats);
  };

  const grouped = (["files", "web", "content"] as const).map((cat) => ({
    cat,
    options: FORMAT_OPTIONS.filter((o) => o.category === cat),
  }));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[200] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="bg-graphite border border-crystal rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-crystal/50">
                <div>
                  <h2 className="text-sm font-bold text-silk">Que veux-tu recevoir ?</h2>
                  <p className="text-[10px] text-silk/40 mt-0.5">Coche les formats. Tu peux tout combiner.</p>
                </div>
                <button onClick={onSkip} className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/25 hover:text-silk/60 hover:bg-crystal transition-all">
                  <X size={14} />
                </button>
              </div>

              {/* Warning E2B */}
              <AnimatePresence>
                {showE2BWarning && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="flex items-start gap-2 px-5 py-3 bg-warning/8 border-b border-warning/20">
                      <AlertCircle size={14} className="text-warning/70 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-warning/80">PDF/Excel/PPT/Word nécessitent E2B sandbox.</p>
                        <div className="flex gap-2 mt-1.5">
                          <button onClick={() => document.dispatchEvent(new CustomEvent("navigate-packs"))}
                            className="text-[10px] text-electric/70 hover:text-electric flex items-center gap-1">
                            <ExternalLink size={10} /> Configurer E2B
                          </button>
                          <button onClick={() => setDismissed(true)} className="text-[10px] text-silk/30 hover:text-silk/50">
                            Continuer sans E2B
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Format list */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                {grouped.map(({ cat, options }) => (
                  <div key={cat}>
                    <p className="text-[9px] text-silk/30 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <span>{CATEGORY_LABELS[cat].icon}</span> {CATEGORY_LABELS[cat].label}
                      {cat === "files" && !hasE2B && <span className="text-warning/50 ml-1">— E2B requis</span>}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {options.map((opt) => {
                        const isSelected = selected.includes(opt.id);
                        const isDisabled = opt.needsE2B && !hasE2B && !dismissed;
                        return (
                          <button key={opt.id} onClick={() => !isDisabled && toggle(opt.id)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all",
                              isSelected ? "border-electric/40 bg-electric/8" :
                              isDisabled ? "border-crystal/30 bg-graphite opacity-50 cursor-not-allowed" :
                              "border-crystal/50 bg-graphite-light hover:border-crystal-light"
                            )}>
                            <div className={cn(
                              "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                              isSelected ? "border-electric bg-electric" : "border-crystal/60"
                            )}>
                              {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                            </div>
                            <span className="text-xl shrink-0">{opt.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-xs font-medium", isSelected ? "text-silk" : "text-silk/70")}>{opt.label}</p>
                              <p className="text-[10px] text-silk/35">{opt.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex gap-2 px-5 py-4 border-t border-crystal/50 bg-graphite shrink-0">
                <button onClick={onSkip} className="h-9 px-3 rounded-xl text-xs text-silk/30 hover:text-silk/60 transition-colors">
                  Passer — format par défaut
                </button>
                <Button variant="primary" size="sm" className="flex-1" onClick={handleConfirm}
                  disabled={selected.length === 0}>
                  Continuer <ChevronRight size={14} />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
