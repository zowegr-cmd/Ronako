import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourStep {
  tourId: string;
  route: string;
  emoji: string;
  title: string;
  description: string;
  interactive?: boolean;
  interactiveEvent?: string; // custom DOM event name to listen for
  interactiveHint?: string;
}

interface SpotlightRect {
  top: number; left: number; width: number; height: number;
}

interface TooltipPos {
  top: number; left: number; arrowSide: "top" | "bottom" | "left" | "right";
}

// ─── Steps ────────────────────────────────────────────────────────────────────

const TOUR_STEPS: TourStep[] = [
  {
    tourId: "marcus-chat",
    route: "/workspace",
    emoji: "👋",
    title: "Voici Marcus",
    description: "Ton chef de projet IA. Décris-lui ce que tu veux créer — il s'occupe du reste. Plus ton brief est précis, meilleur sera le résultat.",
  },
  {
    tourId: "textarea-brief",
    route: "/workspace",
    emoji: "✍️",
    title: "Ton brief",
    description: "Marcus te posera des questions si tu es trop vague. Il analyse ton brief avant de lancer pour t'alerter des points manquants.",
  },
  {
    tourId: "launch-button",
    route: "/workspace",
    emoji: "⚡",
    title: "Lance l'équipe",
    description: "Marcus sélectionne les agents adaptés à ton projet. Tu valides la proposition — agents, mode et coût — avant qu'ils travaillent.",
  },
  {
    tourId: "mode-selector",
    route: "/workspace",
    emoji: "💰",
    title: "Choisis ton investissement",
    description: "⚡ Éclair ~€0.01 · 🎯 Projet ~€0.15 · ♾️ Infini ~€4+\n\nChaque mode adapte les modèles IA et l'optimisation Relay.",
  },
  {
    tourId: "relay-indicator",
    route: "/orchestrator",
    emoji: "⟡",
    title: "Relay réduit tes coûts",
    description: "L'agent Relay distille le contexte entre les agents. Au lieu de répéter 2000 tokens, il résume en 150 tokens. Économie : 60-80%.",
  },
  {
    tourId: "score-ryo",
    route: "/workspace",
    emoji: "📄",
    title: "Ton livrable est noté",
    description: "Ryo note chaque livrable sur 10. ≥8 = exploitable directement. <7 = points à améliorer identifiés. Copie en 1 clic pour Claude Code.",
  },
  {
    tourId: "library-tab",
    route: "/workspace",
    emoji: "📚",
    title: "Tout est sauvegardé",
    description: "Chaque livrable est sauvegardé automatiquement. Rouvre, compare deux versions ou retravaille avec les options Relay Delta.",
  },
  {
    tourId: "agent-grid",
    route: "/studio",
    emoji: "🤖",
    title: "Ton équipe d'agents",
    description: "12 agents spécialisés. Clique sur Sofia pour explorer son profil.",
    interactive: true,
    interactiveEvent: "tour-sofia-clicked",
    interactiveHint: "Clique sur Sofia dans la liste →",
  },
  {
    tourId: "skills-tab",
    route: "/studio",
    emoji: "⚡",
    title: "Skills et Connecteurs",
    description: "Les skills enrichissent le prompt de l'agent sans changer son rôle. Les connecteurs lui donnent accès à des outils externes.",
  },
  {
    tourId: "chain-dnd",
    route: "/orchestrator",
    emoji: "🔗",
    title: "Compose ton équipe",
    description: "Glisse les agents pour réordonner la chaîne. Le bouton Optimiser réorganise selon la matrice de dépendances.",
    interactive: true,
    interactiveEvent: "tour-dnd-moved",
    interactiveHint: "Essaie de déplacer un agent →",
  },
  {
    tourId: "consultant-dock-button",
    route: "/workspace",
    emoji: "💡",
    title: "Tes consultants",
    description: "4 consultants disponibles à tout moment. Idéation, Prompt Machine, Veille Tech et Nova modifient tes agents directement depuis le chat.",
    interactive: true,
    interactiveEvent: "tour-dock-opened",
    interactiveHint: "Ouvre le dock consultant →",
  },
  {
    tourId: "textarea-brief",
    route: "/workspace",
    emoji: "🚀",
    title: "Tu es prêt !",
    description: "Lance ta première chaîne et découvre le reste en travaillant. Ce tutoriel est rejouable depuis les Paramètres → Aide.",
  },
];

const TOOLTIP_WIDTH = 320;
const TOOLTIP_HEIGHT_ESTIMATE = 260; // conservateur — évite les chevauchemants
const SPOTLIGHT_PADDING = 10;
const GAP_DEFAULT = 28;       // espace entre spotlight et tooltip
const GAP_INTERACTIVE = 36;   // plus grand pour les étapes cliquables
const RETRY_DELAY = 120;
const INTERACTIVE_TIMEOUT = 10_000;

// ─── Position utils ───────────────────────────────────────────────────────────

function getTooltipPos(rect: SpotlightRect, interactive = false): TooltipPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const p = interactive ? GAP_INTERACTIVE : GAP_DEFAULT;
  const w = TOOLTIP_WIDTH;
  const h = TOOLTIP_HEIGHT_ESTIMATE;
  const margin = 16;

  const clampL = (x: number) => Math.min(Math.max(x, margin), vw - w - margin);
  const clampT = (y: number) => Math.min(Math.max(y, margin), vh - h - margin);

  // Espace disponible sur chaque côté
  const spaceBelow  = vh - (rect.top + rect.height);
  const spaceAbove  = rect.top;
  const spaceRight  = vw - (rect.left + rect.width);
  const spaceLeft   = rect.left;

  // Candidats triés par espace disponible — on prend le premier qui a assez de place
  const candidates: Array<{ space: number; fn: () => TooltipPos }> = [
    {
      space: spaceBelow,
      fn: () => ({ top: rect.top + rect.height + p, left: clampL(rect.left), arrowSide: "top" }),
    },
    {
      space: spaceAbove,
      fn: () => ({ top: rect.top - h - p, left: clampL(rect.left), arrowSide: "bottom" }),
    },
    {
      space: spaceRight,
      fn: () => ({ top: clampT(rect.top), left: rect.left + rect.width + p, arrowSide: "left" }),
    },
    {
      space: spaceLeft,
      fn: () => ({ top: clampT(rect.top), left: rect.left - w - p, arrowSide: "right" }),
    },
  ];

  // Côté avec assez de place
  const fit = candidates.find((c) => c.space >= h + p);
  if (fit) return fit.fn();

  // Fallback : côté avec le plus d'espace disponible
  return candidates.sort((a, b) => b.space - a.space)[0].fn();
}

function getArrowStyle(pos: TooltipPos, rect: SpotlightRect): React.CSSProperties {
  const center = {
    top: rect.top + rect.height / 2,
    left: rect.left + rect.width / 2,
  };
  const base: React.CSSProperties = {
    position: "absolute", width: 10, height: 10,
    background: "var(--color-graphite, #1A1A1E)",
    border: "1px solid rgba(255,255,255,0.08)",
    transform: "rotate(45deg)",
  };
  if (pos.arrowSide === "top")
    return { ...base, top: -6, left: Math.max(12, Math.min(TOOLTIP_WIDTH - 22, center.left - pos.left - 5)) };
  if (pos.arrowSide === "bottom")
    return { ...base, bottom: -6, left: Math.max(12, Math.min(TOOLTIP_WIDTH - 22, center.left - pos.left - 5)) };
  if (pos.arrowSide === "left")
    return { ...base, left: -6, top: Math.max(12, Math.min(TOOLTIP_HEIGHT_ESTIMATE - 22, center.top - pos.top - 5)) };
  return { ...base, right: -6, top: Math.max(12, Math.min(TOOLTIP_HEIGHT_ESTIMATE - 22, center.top - pos.top - 5)) };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ProductTourProps { onComplete?: () => void; }

export function ProductTour({ onComplete }: ProductTourProps) {
  const { hasSeenTour, setHasSeenTour } = useSettingsStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [active, setActive] = useState(!hasSeenTour);
  const [step, setStep] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null);
  const [showSkipHint, setShowSkipHint] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setActive(false);
    setHasSeenTour(true);
    setSpotlight(null);
    onComplete?.();
  }, [setHasSeenTour, onComplete]);

  const goToStep = useCallback((n: number) => {
    if (n >= TOUR_STEPS.length) { close(); return; }
    setTransitioning(true);
    setSpotlight(null);
    setShowSkipHint(false);
    if (interactiveTimerRef.current) clearTimeout(interactiveTimerRef.current);
    // Short fade before navigating
    setTimeout(() => { setStep(n); setTransitioning(false); }, 180);
  }, [close]);

  const next = useCallback(() => goToStep(step + 1), [step, goToStep]);
  const prev = useCallback(() => goToStep(Math.max(0, step - 1)), [step, goToStep]);

  // Find element and set spotlight
  const findAndHighlight = useCallback((tourId: string, stepIndex: number, attempts = 0) => {
    if (retryRef.current) clearTimeout(retryRef.current);
    const el = document.querySelector<HTMLElement>(`[data-tour="${tourId}"]`);
    if (!el) {
      if (attempts < 20) {
        retryRef.current = setTimeout(() => findAndHighlight(tourId, stepIndex, attempts + 1), RETRY_DELAY);
      }
      return;
    }
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Clamper au viewport pour que le ring bleu ne dépasse jamais les bords
    const rawTop    = rect.top    - SPOTLIGHT_PADDING;
    const rawLeft   = rect.left   - SPOTLIGHT_PADDING;
    const rawBottom = rect.bottom + SPOTLIGHT_PADDING;
    const rawRight  = rect.right  + SPOTLIGHT_PADDING;
    const clampedTop    = Math.max(0, rawTop);
    const clampedLeft   = Math.max(0, rawLeft);
    const clampedBottom = Math.min(vh, rawBottom);
    const clampedRight  = Math.min(vw, rawRight);
    const sr: SpotlightRect = {
      top:    clampedTop,
      left:   clampedLeft,
      width:  Math.max(0, clampedRight  - clampedLeft),
      height: Math.max(0, clampedBottom - clampedTop),
    };
    const isInteractive = TOUR_STEPS[stepIndex]?.interactive ?? false;
    setSpotlight(sr);
    setTooltipPos(getTooltipPos(sr, isInteractive));
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  // Navigate and highlight on step change
  useEffect(() => {
    if (!active || transitioning) return;
    const currentStep = TOUR_STEPS[step];
    if (!currentStep) return;

    if (location.pathname !== currentStep.route) {
      navigate(currentStep.route);
      const t = setTimeout(() => findAndHighlight(currentStep.tourId, step), 350);
      return () => clearTimeout(t);
    }
    findAndHighlight(currentStep.tourId, step);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step, transitioning, location.pathname]);

  // Interactive step: listen for event + timeout
  useEffect(() => {
    if (!active) return;
    const currentStep = TOUR_STEPS[step];
    if (!currentStep?.interactive || !currentStep.interactiveEvent) return;

    const handler = () => next();
    document.addEventListener(currentStep.interactiveEvent, handler);

    interactiveTimerRef.current = setTimeout(() => setShowSkipHint(true), INTERACTIVE_TIMEOUT);

    return () => {
      document.removeEventListener(currentStep.interactiveEvent!, handler);
      if (interactiveTimerRef.current) clearTimeout(interactiveTimerRef.current);
    };
  }, [active, step, next]);

  // Open from Settings
  useEffect(() => {
    const handler = () => { setActive(true); setStep(0); setHasSeenTour(false); };
    document.addEventListener("open-tour", handler);
    return () => document.removeEventListener("open-tour", handler);
  }, [setHasSeenTour]);

  // Keyboard
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, next, prev, close]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (retryRef.current) clearTimeout(retryRef.current);
    if (interactiveTimerRef.current) clearTimeout(interactiveTimerRef.current);
  }, []);

  const currentStep = TOUR_STEPS[step];
  const isLastStep = step === TOUR_STEPS.length - 1;
  const isInteractive = !!currentStep?.interactive;

  if (!active) return null;

  const fallbackTooltipPos: TooltipPos = {
    top: Math.round(window.innerHeight / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2),
    left: Math.round(window.innerWidth / 2 - TOOLTIP_WIDTH / 2),
    arrowSide: "top",
  };
  const tp = tooltipPos ?? fallbackTooltipPos;
  const arrowStyle = spotlight ? getArrowStyle(tp, spotlight) : undefined;

  const DARK = "rgba(0,0,0,0.55)";
  const TR = "all 0.28s ease";

  return (
    <>
      {/* ── 4 rectangles sombres autour de la cible — zone ciblée reste lumineuse ── */}
      {spotlight ? (
        <>
          {/* Haut */}
          <div style={{ position:"fixed", zIndex:9998, pointerEvents:"none", transition: TR,
            top:0, left:0, right:0, height: spotlight.top, background: DARK }} />
          {/* Bas */}
          <div style={{ position:"fixed", zIndex:9998, pointerEvents:"none", transition: TR,
            top: spotlight.top + spotlight.height, left:0, right:0, bottom:0, background: DARK }} />
          {/* Gauche */}
          <div style={{ position:"fixed", zIndex:9998, pointerEvents:"none", transition: TR,
            top: spotlight.top, left:0, width: spotlight.left, height: spotlight.height, background: DARK }} />
          {/* Droite */}
          <div style={{ position:"fixed", zIndex:9998, pointerEvents:"none", transition: TR,
            top: spotlight.top, left: spotlight.left + spotlight.width, right:0, height: spotlight.height, background: DARK }} />
          {/* Ring electric autour de la cible */}
          <div style={{ position:"fixed", zIndex:9999, pointerEvents:"none", transition: TR,
            top: spotlight.top, left: spotlight.left, width: spotlight.width, height: spotlight.height,
            borderRadius: 10,
            border: "2px solid rgba(0,122,255,0.75)",
            boxShadow: "0 0 0 3px rgba(0,122,255,0.18), 0 0 20px rgba(0,122,255,0.15)",
          }} />
        </>
      ) : (
        /* Pas encore d'élément trouvé : overlay simple */
        <div style={{ position:"fixed", inset:0, zIndex:9998, pointerEvents:"none", background: DARK }} />
      )}

      {/* ── Tooltip ─────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {!transitioning && (
          <motion.div
            key={`tooltip-${step}`}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              position: "fixed",
              top: tp.top,
              left: tp.left,
              width: TOOLTIP_WIDTH,
              zIndex: 10000,
            }}
            className="bg-graphite border border-crystal/70 rounded-2xl shadow-2xl overflow-visible"
          >
            {/* Arrow */}
            {arrowStyle && <div style={arrowStyle} />}

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-0">
              <div className="flex gap-1">
                {TOUR_STEPS.map((_, i) => (
                  <div key={i} className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    i === step ? "w-5 bg-electric" : i < step ? "w-1 bg-electric/40" : "w-1 bg-crystal",
                  )} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-silk/25">{step + 1}/{TOUR_STEPS.length}</span>
                <button onClick={close}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-silk/20 hover:text-silk/60 hover:bg-crystal/50 transition-all">
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-5 pt-4 pb-3 flex flex-col gap-3">
              <div className="text-3xl text-center leading-none">{currentStep.emoji}</div>
              <div>
                <h3 className="text-sm font-bold text-silk mb-1 text-center">{currentStep.title}</h3>
                <p className="text-xs text-silk/55 leading-relaxed whitespace-pre-line text-center">{currentStep.description}</p>
              </div>

              {/* Interactive hint */}
              {isInteractive && currentStep.interactiveHint && !showSkipHint && (
                <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-electric/8 border border-electric/20">
                  <span className="text-xs text-electric/70 font-medium">{currentStep.interactiveHint}</span>
                </div>
              )}
              {isInteractive && showSkipHint && (
                <button onClick={next}
                  className="text-xs text-silk/30 hover:text-silk/60 text-center transition-colors py-1">
                  Continuer sans essayer →
                </button>
              )}
            </div>

            {/* Navigation */}
            <div className="flex gap-2 px-4 pb-4">
              {step > 0 ? (
                <button onClick={prev}
                  className="w-8 h-8 rounded-xl flex items-center justify-center border border-crystal text-silk/35 hover:text-silk hover:border-crystal-light transition-all">
                  <ChevronLeft size={14} />
                </button>
              ) : (
                <button onClick={close}
                  className="h-8 px-3 rounded-xl text-xs text-silk/25 hover:text-silk/50 transition-all">
                  Passer
                </button>
              )}

              {(!isInteractive || isLastStep) && (
                <button onClick={next}
                  className="flex-1 h-8 rounded-xl bg-electric text-white text-xs font-semibold flex items-center justify-center gap-1 hover:bg-electric/90 transition-all">
                  {isLastStep ? "C'est parti ! 🚀" : <><span>Suivant</span><ChevronRight size={13} /></>}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
