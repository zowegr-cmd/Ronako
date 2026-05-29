import { useState, useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Shield, Volume2, VolumeX, CreditCard, Info, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Slider } from "@/components/ui/Slider";
import { Badge } from "@/components/ui/Badge";
import { MODEL_LABELS, MODEL_COST_RATES, type ModelId } from "@/types";
import { useSettingsStore } from "@/store/settingsStore";
import { formatCost } from "@/lib/utils";

const MODELS: ModelId[] = ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"];

export function Settings() {
  const {
    apiKey, keyLoaded, loadApiKey, saveApiKey, deleteApiKey,
    soundEnabled, setSoundEnabled,
    monthlyBudgetCap, setMonthlyBudgetCap,
    monthlySpend, hasValidApiKey,
  } = useSettingsStore();

  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Charger la clé depuis le keyring au montage
  useEffect(() => {
    if (!keyLoaded) loadApiKey();
  }, [keyLoaded, loadApiKey]);

  // Remplir le champ quand la clé est chargée
  useEffect(() => {
    if (keyLoaded && apiKey) setKeyInput(apiKey);
  }, [keyLoaded, apiKey]);

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return;
    setSaving(true);
    try {
      await saveApiKey(keyInput.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async () => {
    await deleteApiKey();
    setKeyInput("");
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 pt-5 pb-4 border-b border-crystal/50 shrink-0">
        <h1 className="text-lg font-bold text-silk">Paramètres</h1>
        <p className="text-xs text-silk/35 mt-0.5">Configuration de Ronako</p>
      </div>

      <div className="p-5 flex flex-col gap-4 max-w-xl">

        {/* ── Clé API ────────────────────────────────────────────────────── */}
        <Section title="Clé API Anthropic" icon={<Shield size={14} />}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {hasValidApiKey()
                ? <Badge variant="success" dot>Clé valide — stockée dans le keyring OS</Badge>
                : <Badge variant="ghost">Aucune clé configurée</Badge>
              }
            </div>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
                placeholder="sk-ant-api03-…"
                className="w-full bg-graphite-light border border-crystal rounded-xl px-3 pr-10 py-2.5 text-sm text-silk font-mono placeholder-silk/25 focus:outline-none focus:border-electric/50 transition-colors"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-silk/30 hover:text-silk/70 transition-colors"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveKey}
                loading={saving}
                disabled={!keyInput.trim() || saving}
              >
                {saved ? <><Check size={12} /> Sauvegardé</> : "Sauvegarder"}
              </Button>
              {hasValidApiKey() && (
                <Button variant="danger" size="sm" onClick={handleDeleteKey}>
                  <Trash2 size={12} /> Supprimer
                </Button>
              )}
            </div>

            <p className="text-[11px] text-silk/25 leading-relaxed">
              Stockée dans le <strong className="text-silk/40">keyring natif</strong> de votre OS
              (Windows Credential Manager / macOS Keychain). Jamais en clair sur le disque.
            </p>
          </div>
        </Section>

        {/* ── Coût par modèle ─────────────────────────────────────────────── */}
        <Section title="Tarifs des modèles" icon={<CreditCard size={14} />}>
          <div className="flex flex-col gap-2">
            {MODELS.map((m) => {
              const rates = MODEL_COST_RATES[m];
              return (
                <div key={m} className="flex items-center justify-between py-1.5 border-b border-crystal/40 last:border-0">
                  <span className="text-xs text-silk/70 font-medium">{MODEL_LABELS[m]}</span>
                  <div className="flex gap-3 text-[11px] text-silk/40">
                    <span>input {formatCost(rates.input * 10)}/1k tok</span>
                    <span>output {formatCost(rates.output * 10)}/1k tok</span>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-silk/50">Dépenses ce mois</span>
              <span className="text-sm font-semibold text-silk">{formatCost(monthlySpend)}</span>
            </div>
            <Slider
              value={monthlyBudgetCap}
              onChange={setMonthlyBudgetCap}
              min={100}
              max={5000}
              label={`Plafond mensuel — ${formatCost(monthlyBudgetCap)}`}
            />
          </div>
        </Section>

        {/* ── Son ─────────────────────────────────────────────────────────── */}
        <Section
          title="Son"
          icon={soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        >
          <Toggle
            checked={soundEnabled}
            onChange={setSoundEnabled}
            label="Effets sonores (micro-clic, notification)"
          />
        </Section>

        {/* ── À propos ────────────────────────────────────────────────────── */}
        <Section title="À propos" icon={<Info size={14} />}>
          <div className="flex flex-col gap-1.5">
            <Row label="Version" value="0.1.0 — Phase 2" />
            <Row label="Stack" value="Tauri 2 · React 18 · TypeScript · Tailwind" />
            <Row label="API" value="Anthropic — Claude 4.x" />
          </div>
        </Section>

      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-graphite border border-crystal rounded-2xl overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-crystal/50">
        <span className="text-silk/40">{icon}</span>
        <p className="text-xs font-semibold text-silk/60 uppercase tracking-wider">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-silk/40">{label}</span>
      <span className="text-xs text-silk/70 font-mono">{value}</span>
    </div>
  );
}
