import { useState, useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Eye, EyeOff, Shield, Volume2, VolumeX, CreditCard,
  Info, Trash2, Check, RotateCcw, Plug, Key,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Toggle } from "@/components/ui/Toggle";
import { Slider } from "@/components/ui/Slider";
import { Badge } from "@/components/ui/Badge";
import { MODEL_LABELS, MODEL_COST_RATES, type ModelId } from "@/types";
import { ALL_CONNECTORS } from "@/lib/connectors/types";
import { useSettingsStore } from "@/store/settingsStore";
import { formatCost } from "@/lib/utils";
import type { ConnectorKeys } from "@/store/settingsStore";

const MODELS: ModelId[] = ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"];

export function Settings() {
  const {
    apiKey, keyLoaded, loadApiKey, saveApiKey, deleteApiKey,
    soundEnabled, setSoundEnabled,
    monthlyBudgetCap, setMonthlyBudgetCap,
    monthlySpend, hasValidApiKey,
    resetMonthlySpend, connectorKeys, setConnectorKey,
  } = useSettingsStore();

  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [connectorInputs, setConnectorInputs] = useState<Record<string, string>>({});
  const [showConnectorKey, setShowConnectorKey] = useState<Record<string, boolean>>({});
  const [savingConnector, setSavingConnector] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!keyLoaded) loadApiKey();
  }, [keyLoaded, loadApiKey]);

  useEffect(() => {
    if (keyLoaded && apiKey) setKeyInput(apiKey);
  }, [keyLoaded, apiKey]);

  useEffect(() => {
    // Pré-remplir les champs connecteurs depuis le store
    const inputs: Record<string, string> = {};
    for (const c of ALL_CONNECTORS) {
      inputs[c.id] = connectorKeys[c.apiKeyName] ?? "";
    }
    setConnectorInputs(inputs);
  }, [connectorKeys]);

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

  const handleSaveConnector = async (connectorId: string, apiKeyName: keyof ConnectorKeys) => {
    const val = connectorInputs[connectorId] ?? "";
    setSavingConnector((s) => ({ ...s, [connectorId]: true }));
    try {
      await setConnectorKey(apiKeyName, val);
    } finally {
      setSavingConnector((s) => ({ ...s, [connectorId]: false }));
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 pt-5 pb-4 border-b border-crystal/50 shrink-0">
        <h1 className="text-lg font-bold text-silk">Paramètres</h1>
        <p className="text-xs text-silk/35 mt-0.5">Configuration de Ronako</p>
      </div>

      <div className="p-5 flex flex-col gap-4 max-w-xl">

        {/* ── Clé API Anthropic ─────────────────────────────────────── */}
        <Section title="Clé API Anthropic" icon={<Shield size={14} />}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {hasValidApiKey()
                ? <Badge variant="success" dot>Clé valide — Windows Credential Manager</Badge>
                : <Badge variant="ghost">Aucune clé configurée</Badge>}
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
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleSaveKey} loading={saving} disabled={!keyInput.trim()}>
                {saved ? <><Check size={12} /> Sauvegardé</> : "Sauvegarder"}
              </Button>
              {hasValidApiKey() && (
                <Button variant="danger" size="sm" onClick={() => { deleteApiKey(); setKeyInput(""); }}>
                  <Trash2 size={12} /> Supprimer
                </Button>
              )}
            </div>
            <p className="text-[11px] text-silk/25 leading-relaxed">
              Stockée dans le <strong className="text-silk/40">keyring natif OS</strong>. Jamais en clair sur le disque.
            </p>
          </div>
        </Section>

        {/* ── Connecteurs & APIs ────────────────────────────────────── */}
        <Section title="Connecteurs & APIs" icon={<Plug size={14} />}>
          <div className="flex flex-col gap-3">
            <p className="text-xs text-silk/40 leading-relaxed">
              Clés stockées dans le keyring OS. Activez les connecteurs sur chaque agent via l'Agent Studio.
            </p>
            {ALL_CONNECTORS.map((connector) => (
              <div key={connector.id} className="flex flex-col gap-1.5 pb-3 border-b border-crystal/30 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{connector.icon}</span>
                  <p className="text-xs font-medium text-silk/70">{connector.name}</p>
                  <p className="text-[10px] text-silk/30 flex-1 truncate">{connector.description}</p>
                  {connectorKeys[connector.apiKeyName] && (
                    <Badge variant="success" className="text-[9px]">✓</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showConnectorKey[connector.id] ? "text" : "password"}
                      value={connectorInputs[connector.id] ?? ""}
                      onChange={(e) => setConnectorInputs((s) => ({ ...s, [connector.id]: e.target.value }))}
                      placeholder={`Clé ${connector.name}…`}
                      className="w-full bg-graphite-light border border-crystal rounded-lg px-2.5 pr-8 py-1.5 text-xs text-silk font-mono placeholder-silk/20 focus:outline-none focus:border-electric/40 transition-colors"
                    />
                    <button
                      onClick={() => setShowConnectorKey((s) => ({ ...s, [connector.id]: !s[connector.id] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-silk/20 hover:text-silk/50"
                    >
                      {showConnectorKey[connector.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-7 text-[11px]"
                    loading={savingConnector[connector.id]}
                    onClick={() => handleSaveConnector(connector.id, connector.apiKeyName)}
                  >
                    <Key size={10} /> Sauver
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Budget ────────────────────────────────────────────────── */}
        <Section title="Budget" icon={<CreditCard size={14} />}
          tooltip={{ title: "Budget mensuel", description: "Le plafond bloque automatiquement les nouvelles chaînes quand atteint. Les tarifs affichés sont les coûts Anthropic — Ronako ne prend aucune marge." }}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between py-1.5 border border-crystal rounded-xl px-3">
              <div>
                <p className="text-xs font-medium text-silk">Dépenses ce mois</p>
                <p className="text-[10px] text-silk/30">Se remet à zéro automatiquement chaque mois</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-silk">{formatCost(monthlySpend)}</span>
                <button
                  onClick={resetMonthlySpend}
                  title="Réinitialiser"
                  className="w-6 h-6 rounded-md flex items-center justify-center text-silk/25 hover:text-warning hover:bg-warning/10 transition-all"
                >
                  <RotateCcw size={11} />
                </button>
              </div>
            </div>
            <Slider
              value={monthlyBudgetCap}
              onChange={setMonthlyBudgetCap}
              min={100}
              max={5000}
              label={`Plafond mensuel — ${formatCost(monthlyBudgetCap)}`}
            />
            <div className="flex flex-col gap-1">
              {MODELS.map((m) => {
                const r = MODEL_COST_RATES[m];
                return (
                  <div key={m} className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] text-silk/50">{MODEL_LABELS[m]}</span>
                    <span className="text-[10px] text-silk/30 font-mono">
                      {formatCost(r.input * 10)}/1k in · {formatCost(r.output * 10)}/1k out
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ── Son ──────────────────────────────────────────────────── */}
        {/* ── Contrôle chaîne ───────────────────────────────────────── */}
        <Section title="Contrôle de la chaîne" icon={<Info size={14} />}
          tooltip={{ title: "Validation par étape", description: "Quand actif, la chaîne se met en pause après chaque agent clé. Tu peux lire l'output et décider de continuer ou modifier avant le suivant." }}>
          <ValidationSettings />
        </Section>

        <Section title="Son" icon={soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}>
          <Toggle
            checked={soundEnabled}
            onChange={setSoundEnabled}
            label="Effets sonores (clic DnD, clochette fin de chaîne, accord démarrage)"
          />
        </Section>

        {/* ── Aide ──────────────────────────────────────────────────── */}
        <Section title="Aide" icon={<Info size={14} />}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => document.dispatchEvent(new Event("open-tour"))}
            className="w-full justify-start text-silk/60 hover:text-silk"
          >
            Revoir le tutoriel de démarrage
          </Button>
        </Section>

        {/* ── À propos ──────────────────────────────────────────────── */}
        <Section title="À propos" icon={<Info size={14} />}>
          <div className="flex flex-col gap-1.5">
            <Row label="Version" value="0.2.0 — Phase V2" />
            <Row label="Stack" value="Tauri 2 · React 18 · TypeScript · Tailwind" />
            <Row label="API" value="Anthropic — Claude Opus 4 / Sonnet 4.6 / Haiku 4.5" />
          </div>
        </Section>

      </div>
    </div>
  );
}

function ValidationSettings() {
  const { validationSettings, setValidationSettings } = useChainStore();
  return (
    <div className="flex flex-col gap-3">
      <Toggle
        checked={validationSettings.enabled}
        onChange={(v) => setValidationSettings({ enabled: v })}
        label="Validation par étape (pause après chaque agent clé)"
      />
      {validationSettings.enabled && (
        <div className="flex flex-col gap-1.5 pl-4 border-l border-crystal/50">
          {(["all", "key", "custom"] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={validationSettings.agentsToValidate === opt}
                onChange={() => setValidationSettings({ agentsToValidate: opt })}
                className="accent-electric" />
              <span className="text-xs text-silk/60">
                {opt === "all" ? "Chaque agent" : opt === "key" ? "Agents clés (Marcus, Leo, Nina, Ella)" : "Personnalisé"}
              </span>
            </label>
          ))}
        </div>
      )}
      <p className="text-[11px] text-silk/25">
        Désactivé par défaut. Quand actif, la chaîne se met en pause pour que tu valides ou modifies chaque output avant de continuer.
      </p>
    </div>
  );
}

import { useChainStore } from "@/store/chainStore";

function Section({ title, icon, children, tooltip }: { title: string; icon: ReactNode; children: ReactNode; tooltip?: { title: string; description: string } }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-graphite border border-crystal rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-crystal/50">
        <span className="text-silk/40">{icon}</span>
        <p className="text-xs font-semibold text-silk/60 uppercase tracking-wider">{title}</p>
        {tooltip && <InfoTooltip title={tooltip.title} description={tooltip.description} size={11} />}
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
