import { useState } from "react";
import { type ReactNode } from "react";
import { Wand2, Globe, Image, FileText, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Agent, AgentTool, ModelId } from "@/types";
import { MODEL_LABELS, MODEL_TIERS } from "@/types";
import { ALL_CONNECTORS } from "@/lib/connectors/types";
import { AgentAvatar } from "./AgentAvatar";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import { Badge } from "@/components/ui/Badge";
import { useSettingsStore } from "@/store/settingsStore";

const MODEL_OPTIONS: ModelId[] = [
  MODEL_TIERS.orchestrator,
  MODEL_TIERS.analyst,
  MODEL_TIERS.specialist,
];

const GRADIENT_PRESETS: [string, string][] = [
  ["#F59E0B", "#EF4444"],
  ["#10B981", "#06B6D4"],
  ["#8B5CF6", "#EC4899"],
  ["#64748B", "#6366F1"],
  ["#007AFF", "#A259FF"],
  ["#F97316", "#FBBF24"],
  ["#0EA5E9", "#10B981"],
  ["#EF4444", "#F97316"],
];

const TOOL_OPTIONS: Array<{ id: AgentTool; label: string; icon: ReactNode; hint: string }> = [
  { id: "web_search", label: "Recherche Web", icon: <Globe size={14} />, hint: "Active Tavily ou autre moteur selon le connecteur configuré" },
  { id: "image_gen", label: "Génération d'images", icon: <Image size={14} />, hint: "Active DALL-E, Flux ou Replicate selon le connecteur configuré" },
  { id: "file_read", label: "Lecture fichiers", icon: <FileText size={14} />, hint: "Accès au dossier projet lié (lecture seule)" },
];

// Mapping tool → connecteurs associés
const TOOL_CONNECTORS: Record<AgentTool, string[]> = {
  web_search: ["tavily"],
  image_gen: ["dalle", "flux", "replicate"],
  file_read: [],
};

// Connecteurs qui ne nécessitent pas de tool activé (toujours disponibles)
const STANDALONE_CONNECTORS = ["e2b", "notion", "github", "screenshot"];

interface AgentFormProps {
  initial?: Partial<Agent>;
  onSave: (data: Omit<Agent, "id">) => void;
  onCancel: () => void;
}

export function AgentForm({ initial, onSave, onCancel }: AgentFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [model, setModel] = useState<ModelId>(initial?.model ?? MODEL_TIERS.analyst);
  const [temperature, setTemperature] = useState(initial?.temperature ?? 70);
  const [prompt, setPrompt] = useState(initial?.systemPrompt ?? "");
  const [colors, setColors] = useState<[string, string]>(initial?.colors ?? GRADIENT_PRESETS[0]);
  const [tools, setTools] = useState<AgentTool[]>(initial?.tools ?? []);
  const [connectors, setConnectors] = useState<string[]>(initial?.connectors ?? []);
  const [activeTab, setActiveTab] = useState<"general" | "connectors">("general");

  const { connectorKeys } = useSettingsStore();
  const navigate = useNavigate();

  const toggleTool = (tool: AgentTool) => {
    setTools((t) => (t.includes(tool) ? t.filter((x) => x !== tool) : [...t, tool]));
  };

  const toggleConnector = (id: string) => {
    setConnectors((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  };

  const isKeyConfigured = (connectorId: string) => {
    const connector = ALL_CONNECTORS.find((c) => c.id === connectorId);
    if (!connector) return false;
    return !!connectorKeys[connector.apiKeyName];
  };

  const handleSave = () => {
    if (!name.trim() || !role.trim()) return;
    onSave({ name, role, description, model, temperature, systemPrompt: prompt, colors, tools, connectors });
  };

  // Connecteurs liés aux outils activés + standalone
  const relevantConnectors = ALL_CONNECTORS.filter((c) => {
    const linkedTools = Object.entries(TOOL_CONNECTORS)
      .filter(([, ids]) => ids.includes(c.id))
      .map(([tool]) => tool as AgentTool);
    const isLinkedToActiveTool = linkedTools.some((t) => tools.includes(t));
    const isStandalone = STANDALONE_CONNECTORS.includes(c.id);
    return isLinkedToActiveTool || isStandalone;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Preview + nom */}
      <div className="flex items-center gap-4">
        <AgentAvatar colors={colors} name={name || "??"} size={56} />
        <div className="flex-1 flex flex-col gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de l'agent"
            className="bg-graphite-light border border-crystal rounded-xl px-3 py-2 text-sm text-silk placeholder-silk/30 focus:outline-none focus:border-electric/50 transition-colors"
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Rôle (ex: Analyste SEO)"
            className="bg-graphite-light border border-crystal rounded-xl px-3 py-2 text-xs text-silk/70 placeholder-silk/30 focus:outline-none focus:border-electric/50 transition-colors"
          />
        </div>
      </div>

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description courte"
        className="bg-graphite-light border border-crystal rounded-xl px-3 py-2 text-xs text-silk/70 placeholder-silk/30 focus:outline-none focus:border-electric/50 transition-colors"
      />

      {/* Onglets Général / Connecteurs */}
      <div className="flex border-b border-crystal/50 -mx-1">
        {(["general", "connectors"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "text-electric border-b-2 border-electric -mb-px"
                : "text-silk/40 hover:text-silk/60"
            }`}
          >
            {tab === "general" ? "Général" : "Connecteurs & Outils"}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <div className="flex flex-col gap-4">
          {/* Modèle */}
          <div>
            <p className="text-xs text-silk/40 mb-2">Modèle IA</p>
            <div className="flex gap-2">
              {MODEL_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                    model === m
                      ? "bg-electric/15 border-electric/40 text-electric"
                      : "bg-transparent border-crystal text-silk/50 hover:border-crystal-light"
                  }`}
                >
                  {MODEL_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Température */}
          <Slider value={temperature} onChange={setTemperature} label="Température (créativité)" color="electric" />

          {/* Gradient */}
          <div>
            <p className="text-xs text-silk/40 mb-2">Couleur avatar</p>
            <div className="flex gap-2 flex-wrap">
              {GRADIENT_PRESETS.map(([c1, c2]) => (
                <button
                  key={`${c1}${c2}`}
                  onClick={() => setColors([c1, c2])}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    colors[0] === c1 && colors[1] === c2 ? "border-white scale-110" : "border-transparent hover:scale-105"
                  }`}
                  style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                />
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <p className="text-xs text-silk/40 mb-2">Prompt système</p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Définis le rôle, les instructions et le comportement de cet agent…"
              rows={4}
              className="w-full bg-graphite-light border border-crystal rounded-xl px-3 py-2 text-xs text-silk/80 placeholder-silk/30 focus:outline-none focus:border-electric/50 transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>
      )}

      {activeTab === "connectors" && (
        <div className="flex flex-col gap-4">
          {/* Super-pouvoirs (outils de base) */}
          <div>
            <p className="text-xs text-silk/40 mb-2 uppercase tracking-widest">Super-pouvoirs</p>
            <div className="flex flex-col gap-2">
              {TOOL_OPTIONS.map((t) => (
                <div key={t.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2 text-sm text-silk/70">
                      {t.icon} {t.label}
                    </div>
                    <Toggle checked={tools.includes(t.id)} onChange={() => toggleTool(t.id)} size="sm" />
                  </div>
                  {tools.includes(t.id) && (
                    <p className="text-[10px] text-silk/30 pl-5 -mt-1">{t.hint}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Connecteurs APIs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-silk/40 uppercase tracking-widest">Connecteurs APIs</p>
              <button
                onClick={() => { onCancel(); navigate("/settings"); }}
                className="text-[10px] text-electric/60 hover:text-electric flex items-center gap-1 transition-colors"
              >
                <ExternalLink size={10} /> Configurer les clés
              </button>
            </div>

            {relevantConnectors.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-silk/30">Activez un super-pouvoir pour voir les connecteurs disponibles.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {relevantConnectors.map((connector) => {
                  const hasKey = isKeyConfigured(connector.id);
                  const isEnabled = connectors.includes(connector.id);
                  const linkedTools = Object.entries(TOOL_CONNECTORS)
                    .filter(([, ids]) => ids.includes(connector.id))
                    .map(([tool]) => tool);

                  return (
                    <div
                      key={connector.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                        isEnabled && hasKey
                          ? "border-success/30 bg-success/5"
                          : isEnabled && !hasKey
                          ? "border-warning/30 bg-warning/5"
                          : "border-crystal bg-transparent"
                      }`}
                    >
                      <span className="text-base shrink-0">{connector.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-silk/80">{connector.name}</p>
                          {hasKey
                            ? <CheckCircle2 size={11} className="text-success shrink-0" />
                            : <AlertCircle size={11} className="text-silk/25 shrink-0" />
                          }
                          {linkedTools.length > 0 && (
                            <Badge variant="ghost" className="text-[9px] h-4">
                              {linkedTools.join(", ")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-silk/30 truncate">{connector.description}</p>
                        {!hasKey && isEnabled && (
                          <p className="text-[10px] text-warning/60 mt-0.5">
                            Clé API manquante — configurez-la dans les Paramètres
                          </p>
                        )}
                      </div>
                      <Toggle
                        checked={isEnabled}
                        onChange={() => toggleConnector(connector.id)}
                        size="sm"
                        color={hasKey ? "success" : "electric"}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {ALL_CONNECTORS.filter((c) => !relevantConnectors.includes(c)).length > 0 && (
              <p className="text-[10px] text-silk/20 mt-2 text-center">
                {ALL_CONNECTORS.filter((c) => !relevantConnectors.includes(c)).length} autres connecteurs disponibles — activez les super-pouvoirs correspondants
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-1 border-t border-crystal/50">
        <Button variant="ghost" onClick={onCancel}>Annuler</Button>
        <Button variant="primary" onClick={handleSave} disabled={!name.trim()}>
          <Wand2 size={14} />
          {initial?.name ? "Mettre à jour" : "Créer l'agent"}
        </Button>
      </div>
    </div>
  );
}
