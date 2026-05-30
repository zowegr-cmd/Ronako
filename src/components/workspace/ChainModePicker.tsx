import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Check, X, Zap, Timer, Shield, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHAIN_MODES, type ChainMode } from "@/lib/chainModes";
import { useChainStore } from "@/store/chainStore";

const MODE_ORDER: ChainMode[] = ["flash", "project", "infinite", "custom"];

const MODE_DETAILS: Record<ChainMode, {
  bullets: string[];
  warning?: string;
}> = {
  flash: {
    bullets: [
      "Modèles : Haiku 4.5 sur tous les agents (ultra-rapide, -70% coût)",
      "Relay désactivé — contexte direct entre agents",
      "Marcus Check désactivé — pas de vérification cohérence",
      "Agents suggérés : Marcus + Léo + Sam (modifiable librement)",
      "Idéal pour valider une idée ou produire un draft rapide",
    ],
  },
  project: {
    bullets: [
      "Modèles : Sonnet 4.6 (réflexion) + Haiku 4.5 (exécution)",
      "Relay actif — contexte distillé entre agents (~-70% tokens)",
      "Marcus Check actif — cohérence ADN↔Relay vérifiée",
      "ADN Projet complet (150 tokens partagés par tous)",
      "Agents : votre équipe active, toujours modifiable",
    ],
  },
  infinite: {
    bullets: [
      "Modèles : Opus 4.8 sur tous les agents (qualité maximale)",
      "Relay désactivé — chaque agent reçoit le contexte complet",
      "Marcus Check actif — double validation Ryo si score < 9",
      "Confirmation obligatoire avant lancement",
      "Agents : votre équipe active, toujours modifiable",
    ],
    warning: "Coût ~20-80× plus élevé que le mode Projet",
  },
  custom: {
    bullets: [
      "Modèle configurable individuellement par agent",
      "Relay ON/OFF au choix",
      "Marcus Check ON/OFF au choix",
      "Agents : toujours modifiables comme dans les autres modes",
      "Estimation de coût mise à jour en temps réel",
    ],
  },
};

// ─── Sélecteur compact (top bar) ─────────────────────────────────────────────
export function ChainModeSelector() {
  const { chainMode, setChainMode } = useChainStore();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex items-center gap-1">
      {MODE_ORDER.map((m) => {
        const cfg = CHAIN_MODES[m];
        const isActive = chainMode === m;
        return (
          <button
            key={m}
            onClick={() => setChainMode(m)}
            title={cfg.label}
            style={isActive
              ? { color: cfg.color, borderColor: `${cfg.color}50`, backgroundColor: `${cfg.color}18` }
              : {}
            }
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all",
              isActive
                ? ""
                : "border-crystal/50 text-silk/30 hover:text-silk/60 hover:border-crystal",
            )}
          >
            <span className="text-sm leading-none">{cfg.icon}</span>
            <span>{cfg.label}</span>
            {isActive && <Check size={9} className="shrink-0" />}
          </button>
        );
      })}

      {/* Bouton info ───────────────────────────────────────────── */}
      <button
        onClick={() => setShowModal(true)}
        title="Comprendre les modes"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/25 hover:text-silk/60 hover:bg-crystal transition-all border border-transparent hover:border-crystal"
      >
        <Info size={13} />
      </button>

      {/* Modal explicatif ──────────────────────────────────────── */}
      <ChainModeModal
        open={showModal}
        current={chainMode}
        onSelect={(m) => { setChainMode(m); setShowModal(false); }}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}

// ─── Modal 4 cartes expliquées ────────────────────────────────────────────────
function ChainModeModal({
  open, current, onSelect, onClose,
}: {
  open: boolean;
  current: ChainMode;
  onSelect: (m: ChainMode) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div
              className="pointer-events-auto bg-graphite border border-crystal rounded-2xl shadow-2xl overflow-hidden"
              style={{ width: 720, maxHeight: "85vh" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-crystal">
                <div>
                  <h2 className="text-sm font-semibold text-silk">Modes de Chaîne</h2>
                  <p className="text-[11px] text-silk/40 mt-0.5">
                    Choisissez selon votre besoin — le mode peut être changé avant chaque lancement.
                  </p>
                </div>
                <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/30 hover:text-silk hover:bg-crystal transition-all">
                  <X size={14} />
                </button>
              </div>

              {/* 4 cartes */}
              <div className="p-5 grid grid-cols-2 gap-3 overflow-y-auto">
                {MODE_ORDER.map((m) => {
                  const cfg = CHAIN_MODES[m];
                  const details = MODE_DETAILS[m];
                  const isActive = current === m;

                  return (
                    <motion.button
                      key={m}
                      whileHover={{ y: -2 }}
                      onClick={() => onSelect(m)}
                      style={isActive ? { borderColor: `${cfg.color}60` } : {}}
                      className={cn(
                        "flex flex-col gap-3 p-4 rounded-2xl border text-left transition-all",
                        isActive
                          ? "bg-graphite-light"
                          : "border-crystal bg-graphite/50 hover:border-crystal-light hover:bg-graphite-light",
                      )}
                    >
                      {/* Mode header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0"
                            style={{ backgroundColor: `${cfg.color}20`, border: `1px solid ${cfg.color}40` }}
                          >
                            {cfg.icon}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-silk">{cfg.label}</p>
                            <p className="text-[11px] text-silk/50">{cfg.description}</p>
                          </div>
                        </div>
                        {isActive && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: cfg.color }}
                          >
                            <Check size={10} className="text-white" />
                          </div>
                        )}
                      </div>

                      {/* Bullets */}
                      <ul className="flex flex-col gap-1">
                        {details.bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-silk/55 leading-relaxed">
                            <span className="text-silk/20 mt-0.5 shrink-0">•</span>
                            {b}
                          </li>
                        ))}
                      </ul>

                      {/* Métriques */}
                      <div className="flex items-center gap-3 pt-1 border-t border-crystal/40">
                        {cfg.estimatedCost ? (
                          <div className="flex items-center gap-1.5">
                            <Zap size={10} style={{ color: cfg.color }} />
                            <span className="text-[10px] text-silk/40">
                              {(cfg.estimatedCost.min / 100).toFixed(2)}€ — {(cfg.estimatedCost.max / 100).toFixed(2)}€
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Settings size={10} className="text-silk/25" />
                            <span className="text-[10px] text-silk/40">Estimation manuelle</span>
                          </div>
                        )}
                        {cfg.estimatedTime && (
                          <div className="flex items-center gap-1.5">
                            <Timer size={10} className="text-silk/30" />
                            <span className="text-[10px] text-silk/40">
                              ~{Math.round(cfg.estimatedTime.min / 60)}-{Math.round(cfg.estimatedTime.max / 60)} min
                            </span>
                          </div>
                        )}
                        {cfg.relayActive && (
                          <div className="flex items-center gap-1.5">
                            <Shield size={10} className="text-mystic/50" />
                            <span className="text-[10px] text-silk/40">Relay actif</span>
                          </div>
                        )}
                      </div>

                      {/* Use case */}
                      <p className="text-[11px] font-medium" style={{ color: `${cfg.color}cc` }}>
                        → {cfg.useCase}
                      </p>

                      {/* Warning Infini */}
                      {details.warning && (
                        <div className="flex items-center gap-1.5 bg-warning/8 border border-warning/20 rounded-lg px-2.5 py-1.5">
                          <span className="text-[10px] text-warning/70">{details.warning}</span>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-crystal/50 flex items-center justify-between">
                <p className="text-[11px] text-silk/25">
                  Le mode peut être changé à tout moment depuis la top bar du Workspace.
                </p>
                <button onClick={onClose} className="text-xs text-electric/60 hover:text-electric transition-colors">
                  Fermer
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
