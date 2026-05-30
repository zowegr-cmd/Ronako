import { useState, useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Eye, EyeOff, Shield, Volume2, VolumeX, CreditCard,
  Info, Trash2, Check, RotateCcw, Plug, Key, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Toggle } from "@/components/ui/Toggle";
import { Slider } from "@/components/ui/Slider";
import { Badge } from "@/components/ui/Badge";
import { MODEL_LABELS, MODEL_COST_RATES, type ModelId } from "@/types";
import { useSettingsStore } from "@/store/settingsStore";
import { useConnectorStore } from "@/store/connectorStore";
import { useToastStore } from "@/store/toastStore";
import { formatCost } from "@/lib/utils";
import type { MarcusPersona, AppTheme, ExpertiseLevel, DeliverableLanguage } from "@/store/settingsStore";

const MODELS: ModelId[] = ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"];

export function Settings() {
  const {
    apiKey, keyLoaded, loadApiKey, saveApiKey, deleteApiKey,
    soundEnabled, setSoundEnabled,
    monthlyBudgetCap, setMonthlyBudgetCap,
    monthlySpend, hasValidApiKey,
    resetMonthlySpend,
    marcusPersona, setMarcusPersona,
    theme, setTheme,
    expertiseLevel, setExpertiseLevel,
    deliverableLanguage, setDeliverableLanguage,
    focusMode, setFocusMode,
  } = useSettingsStore();

  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!keyLoaded) loadApiKey();
  }, [keyLoaded, loadApiKey]);

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


  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 pt-5 pb-4 border-b border-crystal/50 shrink-0">
        <h1 className="text-lg font-bold text-silk">Paramètres</h1>
        <p className="text-xs text-silk/35 mt-0.5">Configuration de Ronako</p>
      </div>

      <div className="p-5 flex flex-col gap-4 max-w-xl">

        {/* ══ Clés essentielles ══════════════════════════════════════════ */}
        <E2BEssentialSection />

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

        {/* ── Connecteurs & APIs → Pack Manager ─────────────────────── */}
        <Section title="Connecteurs & APIs" icon={<Plug size={14} />}>
          <div className="flex flex-col gap-3">
            <p className="text-xs text-silk/40 leading-relaxed">
              Toute la gestion des connecteurs a été déplacée dans le <strong className="text-silk/60">Pack Manager</strong>.
              Configure tes clés API, ajoute des serveurs MCP, et crée des connecteurs custom depuis un seul endroit.
            </p>
            <Button variant="ghost" size="sm" className="w-full justify-start"
              onClick={() => document.dispatchEvent(new CustomEvent("navigate-packs"))}>
              🔌 Ouvrir le Pack Manager →
            </Button>
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

        {/* ── Style de Marcus (7.9) ────────────────────────────────── */}
        <Section title="Style de Marcus" icon={<Info size={14} />}>
          <div className="flex flex-col gap-2">
            {([ ["direct","Direct","Concis et efficace. Aucune phrase inutile."],
                ["detailed","Détaillé","Explique chaque décision et ses implications."],
                ["coach","Coach","Te guide, te challenge, te pose des questions."],
                ["expert","Expert","Vocabulaire technique, références précises."],
            ] as [MarcusPersona, string, string][]).map(([val, label, desc]) => (
              <label key={val} className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${marcusPersona === val ? "border-electric/40 bg-electric/5" : "border-crystal/40 hover:border-crystal-light"}`}>
                <input type="radio" className="mt-0.5 accent-electric" checked={marcusPersona === val} onChange={() => setMarcusPersona(val)} />
                <div>
                  <p className="text-xs font-medium text-silk">{label}</p>
                  <p className="text-[10px] text-silk/40">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </Section>

        {/* ── Niveau d'expertise (7.14) ─────────────────────────────── */}
        <Section title="Mon niveau" icon={<Info size={14} />}>
          <div className="flex flex-col gap-2">
            {([ ["beginner","Débutant","Marcus explique chaque décision et guide pas à pas."],
                ["intermediate","Intermédiaire","Explications disponibles si demandées."],
                ["expert","Expert","Informations essentielles uniquement. Pas de pédagogie."],
            ] as [ExpertiseLevel, string, string][]).map(([val, label, desc]) => (
              <label key={val} className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${expertiseLevel === val ? "border-electric/40 bg-electric/5" : "border-crystal/40 hover:border-crystal-light"}`}>
                <input type="radio" className="mt-0.5 accent-electric" checked={expertiseLevel === val} onChange={() => setExpertiseLevel(val)} />
                <div>
                  <p className="text-xs font-medium text-silk">{label}</p>
                  <p className="text-[10px] text-silk/40">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </Section>

        {/* ── Thème visuel (7.12) ──────────────────────────────────── */}
        <Section title="Thème visuel" icon={<Info size={14} />}>
          <div className="grid grid-cols-2 gap-2">
            {([ ["mineral","Minéral","#0B0B0C","#007AFF"],
                ["arctic","Arctic","#F5F7FA","#0066CC"],
                ["forest","Forest","#0D1A12","#22C55E"],
                ["sunset","Sunset","#1A0A0A","#F97316"],
            ] as [AppTheme, string, string, string][]).map(([val, label, bg, accent]) => (
              <button key={val} onClick={() => setTheme(val)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${theme === val ? "border-electric/50 bg-electric/5" : "border-crystal/40 hover:border-crystal-light"}`}>
                <div className="w-8 h-8 rounded-lg flex-shrink-0 flex gap-0.5 overflow-hidden" style={{ background: bg }}>
                  <div className="w-3 h-full" style={{ background: accent, opacity: 0.8 }} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-silk">{label}</p>
                  {theme === val && <p className="text-[10px] text-electric/60">Actif</p>}
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Langue des livrables (7.15) ──────────────────────────── */}
        <Section title="Langue des livrables" icon={<Info size={14} />}>
          <div className="flex flex-col gap-2">
            <select
              value={deliverableLanguage}
              onChange={(e) => setDeliverableLanguage(e.target.value as DeliverableLanguage)}
              className="bg-graphite-light border border-crystal rounded-xl px-3 py-2 text-sm text-silk focus:outline-none focus:border-electric/50">
              <option value="fr">🇫🇷 Français (défaut)</option>
              <option value="en">🇬🇧 Anglais</option>
              <option value="es">🇪🇸 Espagnol</option>
              <option value="de">🇩🇪 Allemand</option>
            </select>
            <p className="text-[10px] text-silk/30">L'interface reste en français. Seuls les livrables générés utilisent cette langue.</p>
          </div>
        </Section>

        {/* ── Mode Focus (7.10) ────────────────────────────────────── */}
        <Section title="Interface" icon={<Info size={14} />}>
          <Toggle checked={focusMode} onChange={setFocusMode}
            label="Mode Focus — masque la NavBar et le dock (Ctrl+Shift+F)" />
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

        {/* ── Clés avancées ──────────────────────────────────────────── */}
        <Section title="Clés API avancées" icon={<Key size={14} />}>
          <p className="text-[10px] text-silk/40 mb-3">
            Configure ici les clés pour les connecteurs supplémentaires.
            Toutes stockées dans le trousseau OS — jamais en texte clair.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: "fal", label: "fal.ai", placeholder: "fal_...", url: "https://fal.ai/dashboard/keys" },
              { id: "gemini", label: "Google Gemini", placeholder: "AIza...", url: "https://aistudio.google.com/app/apikey" },
              { id: "ideogram", label: "Ideogram", placeholder: "idg_...", url: "https://ideogram.ai/manage-api" },
              { id: "serper", label: "Serper.dev", placeholder: "...", url: "https://serper.dev/api-key" },
              { id: "perplexity", label: "Perplexity AI", placeholder: "pplx-...", url: "https://www.perplexity.ai/settings/api" },
              { id: "deepgram", label: "Deepgram", placeholder: "...", url: "https://console.deepgram.com" },
              { id: "groq", label: "Groq", placeholder: "gsk_...", url: "https://console.groq.com/keys" },
              { id: "maps", label: "Google Maps API", placeholder: "AIza...", url: "https://console.cloud.google.com" },
              { id: "weather", label: "OpenWeatherMap", placeholder: "...", url: "https://openweathermap.org/api_keys" },
              { id: "hunter", label: "Hunter.io", placeholder: "...", url: "https://hunter.io/api_keys" },
              { id: "twilio", label: "Twilio SID:Token", placeholder: "ACxxx:token", url: "https://console.twilio.com" },
            ].map(({ id, label, placeholder, url }) => (
              <SimpleKeyField key={id} id={id} label={label} placeholder={placeholder} docsUrl={url} />
            ))}
          </div>
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

function SimpleKeyField({ id, label, placeholder, docsUrl }: {
  id: string; label: string; placeholder: string; docsUrl?: string;
}) {
  const { getKey, setKey } = useConnectorStore();
  const [keyInput, setKeyInput] = useState(getKey(id));
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasKey = !!getKey(id);

  const handleSave = async () => {
    setSaving(true);
    try { await setKey(id, keyInput.trim()); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-silk/50 w-28 shrink-0">{label}</span>
      <div className="flex-1 relative">
        <input type={showKey ? "text" : "password"} value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void handleSave()}
          placeholder={placeholder}
          className="w-full bg-graphite-light border border-crystal rounded-lg px-2.5 pr-7 py-1.5 text-xs text-silk font-mono placeholder-silk/20 focus:outline-none focus:border-electric/50" />
        <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-silk/20 hover:text-silk/50">
          {showKey ? <EyeOff size={10} /> : <Eye size={10} />}
        </button>
      </div>
      <button onClick={() => void handleSave()} disabled={!keyInput.trim() || saving}
        className="h-7 px-2 rounded-lg text-[10px] font-medium bg-electric/10 text-electric/80 hover:bg-electric/20 disabled:opacity-40">
        {saving ? "…" : hasKey ? <Check size={10} /> : "Sauver"}
      </button>
      {docsUrl && <a href={docsUrl} target="_blank" rel="noreferrer" className="text-silk/20 hover:text-silk/50"><ExternalLink size={10} /></a>}
    </div>
  );
}

function E2BEssentialSection() {
  const { getKey, setKey } = useConnectorStore();
  const [keyInput, setKeyInput] = useState(getKey("e2b"));
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const hasE2B = !!getKey("e2b");
  const toast = useToastStore();

  const handleSave = async () => {
    setSaving(true);
    try {
      await setKey("e2b", keyInput.trim());
      setSaved(true); setTimeout(() => setSaved(false), 2500);
      toast.success("E2B configuré", "Forge peut maintenant générer des fichiers");
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-electric/5 border border-electric/20 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-electric/10">
        <span className="text-electric text-base">⚡</span>
        <p className="text-xs font-semibold text-electric/80 uppercase tracking-wider">Clé essentielle pour Forge</p>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🖥️</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold text-silk">E2B Sandbox</p>
              {hasE2B
                ? <Badge variant="success" className="text-[9px]">✓ Configuré — Forge opérationnel</Badge>
                : <Badge variant="warning" className="text-[9px]">⚠️ Non configuré</Badge>}
            </div>
            <p className="text-[11px] text-silk/50 leading-relaxed">
              {hasE2B
                ? "Forge peut générer de vrais fichiers PDF, Excel, PowerPoint, Word."
                : "Sans E2B, Forge ne produit que du texte. Configure-le en 2 min pour débloquer la production de vrais fichiers."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type={showKey ? "text" : "password"} value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="e2b_sk_…"
              className="w-full bg-graphite-light border border-crystal rounded-xl px-3 pr-8 py-2 text-xs text-silk font-mono placeholder-silk/25 focus:outline-none focus:border-electric/50" />
            <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-silk/25 hover:text-silk/60">
              {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
          <Button variant="primary" size="sm" loading={saving} disabled={!keyInput.trim()} onClick={handleSave}>
            {saved ? <><Check size={11} /> Sauvé</> : <><Key size={11} /> Sauver</>}
          </Button>
        </div>
        <p className="text-[10px] text-silk/30">
          Obtenir gratuitement → <a href="https://e2b.dev" target="_blank" rel="noreferrer"
            className="text-electric/60 hover:text-electric">e2b.dev</a>
        </p>
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
