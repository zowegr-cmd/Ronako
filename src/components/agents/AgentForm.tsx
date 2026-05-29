import { useState } from "react";
import { type ReactNode } from "react";
import { Wand2, Globe, Image, FileText } from "lucide-react";
import type { Agent, AgentTool, ModelId } from "@/types";
import { MODEL_LABELS, MODEL_TIERS } from "@/types";
import { AgentAvatar } from "./AgentAvatar";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";

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

const TOOL_OPTIONS: Array<{ id: AgentTool; label: string; icon: ReactNode }> = [
  { id: "web_search", label: "Recherche Web", icon: <Globe size={14} /> },
  { id: "image_gen", label: "Génération d'images", icon: <Image size={14} /> },
  { id: "file_read", label: "Lecture fichiers", icon: <FileText size={14} /> },
];

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

  const toggleTool = (tool: AgentTool) =>
    setTools((t) => (t.includes(tool) ? t.filter((x) => x !== tool) : [...t, tool]));

  const handleSave = () => {
    if (!name.trim() || !role.trim()) return;
    onSave({ name, role, description, model, temperature, systemPrompt: prompt, colors, tools });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Preview + name */}
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

      {/* Description */}
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description courte"
        className="bg-graphite-light border border-crystal rounded-xl px-3 py-2 text-xs text-silk/70 placeholder-silk/30 focus:outline-none focus:border-electric/50 transition-colors"
      />

      {/* Model selector */}
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

      {/* Temperature */}
      <Slider
        value={temperature}
        onChange={setTemperature}
        label="Température (créativité)"
        color="electric"
      />

      {/* Gradient picker */}
      <div>
        <p className="text-xs text-silk/40 mb-2">Couleur avatar</p>
        <div className="flex gap-2 flex-wrap">
          {GRADIENT_PRESETS.map(([c1, c2]) => (
            <button
              key={`${c1}${c2}`}
              onClick={() => setColors([c1, c2])}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                colors[0] === c1 && colors[1] === c2
                  ? "border-white scale-110"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
            />
          ))}
        </div>
      </div>

      {/* Tools */}
      <div>
        <p className="text-xs text-silk/40 mb-2">Super-pouvoirs</p>
        <div className="flex flex-col gap-2">
          {TOOL_OPTIONS.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2 text-sm text-silk/60">
                {t.icon}
                {t.label}
              </div>
              <Toggle
                checked={tools.includes(t.id)}
                onChange={() => toggleTool(t.id)}
                size="sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Prompt */}
      <div>
        <p className="text-xs text-silk/40 mb-2">Prompt système</p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Définis le rôle, les instructions et le comportement de cet agent..."
          rows={4}
          className="w-full bg-graphite-light border border-crystal rounded-xl px-3 py-2 text-xs text-silk/80 placeholder-silk/30 focus:outline-none focus:border-electric/50 transition-colors resize-none leading-relaxed"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" onClick={onCancel}>Annuler</Button>
        <Button variant="primary" onClick={handleSave} disabled={!name.trim()}>
          <Wand2 size={14} />
          {initial?.name ? "Mettre à jour" : "Créer l'agent"}
        </Button>
      </div>
    </div>
  );
}
