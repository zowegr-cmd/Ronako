import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

interface TourStep {
  id: number;
  title: string;
  text: string;
  icon: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
}

const STEPS: TourStep[] = [
  {
    id: 1, icon: "👋",
    title: "Voici Marcus",
    text: "Ton chef de projet IA. Décris-lui ce que tu veux créer — il s'occupe du reste. Plus ton brief est précis, meilleur sera le résultat.",
    position: "center",
  },
  {
    id: 2, icon: "✍️",
    title: "Ton brief",
    text: "Marcus te posera des questions si tu es trop vague. Il analyse ton brief avant de lancer pour t'alerter des points manquants.",
    position: "center",
  },
  {
    id: 3, icon: "⚡",
    title: "Lance l'équipe",
    text: "Marcus sélectionne les agents adaptés à ton projet. Tu valides la proposition — agents, mode et coût — avant qu'ils travaillent.",
    position: "center",
  },
  {
    id: 4, icon: "💰",
    title: "Choisis ton investissement",
    text: "⚡ Éclair ~€0.01 · 🎯 Projet ~€0.15 · ♾️ Infini ~€4+\n\nChaque mode adapte les modèles IA et l'optimisation Relay. Le coût est affiché avant chaque lancement.",
    position: "center",
  },
  {
    id: 5, icon: "⟡",
    title: "Relay réduit tes coûts",
    text: "L'Agent Relay distille le contexte entre les agents. Au lieu de répéter 2000 tokens à chaque agent, Relay résume en 150 tokens. Économie : 60-80% automatiquement.",
    position: "center",
  },
  {
    id: 6, icon: "📄",
    title: "Ton livrable est prêt",
    text: "Ryo note chaque livrable sur 10. ≥8 = exploitable directement. <7 = points à améliorer identifiés.\n\nCopie en 1 clic pour Claude Code ou exporte en .md / .html.",
    position: "center",
  },
  {
    id: 7, icon: "📚",
    title: "Tout est sauvegardé",
    text: "Chaque livrable est sauvegardé automatiquement dans la Bibliothèque. Rouvre, compare deux versions ou retravailler avec les options Relay Delta.",
    position: "center",
  },
  {
    id: 8, icon: "🤖",
    title: "Ton équipe d'agents",
    text: "12 agents spécialisés de Marcus (chef d'orchestre) à Sam (note Claude Code). Chaque agent a ses skills, connecteurs et peut être mis en pause dans la chaîne.",
    position: "center",
  },
  {
    id: 9, icon: "⚡",
    title: "Skills et Connecteurs",
    text: "Les skills enrichissent le prompt de l'agent sans changer son rôle. Les connecteurs donnent accès à des outils externes : web search, génération d'images, bases de données.",
    position: "center",
  },
  {
    id: 10, icon: "🔗",
    title: "Compose ton équipe",
    text: "Dans l'Orchestrateur, glisse les agents pour réordonner la chaîne. Le bouton Optimiser réorganise selon la matrice de dépendances pour un résultat optimal.",
    position: "center",
  },
  {
    id: 11, icon: "💡",
    title: "Tes consultants",
    text: "4 consultants disponibles à tout moment depuis le bouton flottant : Idéation, Prompt Machine, Veille Tech et Nova. Ils peuvent modifier tes agents directement depuis le chat.",
    position: "center",
  },
  {
    id: 12, icon: "🚀",
    title: "Tu es prêt !",
    text: "Lance ta première chaîne et découvre le reste en travaillant. Ce tutoriel est rejouable depuis les Paramètres → Aide à tout moment.",
    position: "center",
  },
];

interface ProductTourProps {
  onComplete?: () => void;
}

export function ProductTour({ onComplete }: ProductTourProps) {
  const { hasSeenTour, setHasSeenTour } = useSettingsStore();
  const [active, setActive] = useState(!hasSeenTour);
  const [step, setStep] = useState(0);

  const close = useCallback(() => {
    setActive(false);
    setHasSeenTour(true);
    onComplete?.();
  }, [setHasSeenTour, onComplete]);

  const next = useCallback(() => {
    if (step >= STEPS.length - 1) { close(); return; }
    setStep((s) => s + 1);
  }, [step, close]);

  const prev = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  // Ouvrir depuis Settings
  useEffect(() => {
    const handler = () => { setActive(true); setStep(0); };
    document.addEventListener("open-tour", handler);
    return () => document.removeEventListener("open-tour", handler);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, next, prev, close]);

  const current = STEPS[step];

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Overlay */}
          <motion.div key="tour-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-sm"
          />

          {/* Card centrale */}
          <motion.div key={`tour-card-${step}`}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="fixed inset-0 z-[301] flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto bg-graphite border border-crystal rounded-2xl shadow-2xl overflow-hidden"
              style={{ width: 400 }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-crystal/50">
                {/* Progress dots */}
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <div key={i} className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === step ? "w-6 bg-electric" : i < step ? "w-1.5 bg-electric/40" : "w-1.5 bg-crystal",
                    )} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-silk/30">{step + 1}/{STEPS.length}</span>
                  <button onClick={close}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-silk/25 hover:text-silk/60 hover:bg-crystal transition-all">
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-5 py-6 flex flex-col gap-4">
                <div className="text-4xl text-center">{current.icon}</div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-silk mb-2">{current.title}</h3>
                  <p className="text-sm text-silk/60 leading-relaxed whitespace-pre-line">{current.text}</p>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-2 px-5 pb-5">
                {step > 0 ? (
                  <button onClick={prev}
                    className="w-9 h-9 rounded-xl flex items-center justify-center border border-crystal text-silk/40 hover:text-silk hover:border-crystal-light transition-all">
                    <ChevronLeft size={16} />
                  </button>
                ) : (
                  <button onClick={close}
                    className="h-9 px-3 rounded-xl text-xs text-silk/30 hover:text-silk/60 transition-all">
                    Passer
                  </button>
                )}

                <button onClick={next}
                  className="flex-1 h-9 rounded-xl bg-electric text-white text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-electric/90 transition-all">
                  {step === STEPS.length - 1 ? "C'est parti ! 🚀" : (
                    <><span>Suivant</span><ChevronRight size={14} /></>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
