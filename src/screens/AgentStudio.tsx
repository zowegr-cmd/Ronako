import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Lock, MessageSquare, Pencil,
  Trash2, ToggleLeft, ToggleRight, Package,
  Zap, CheckCircle2, ChevronRight,
} from "lucide-react";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { AgentForm } from "@/components/agents/AgentForm";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import { MarkdownMessage } from "@/components/ui/MarkdownMessage";
import { useAgentStore, BUILTIN_CONSULTANT_IDS } from "@/store/agentStore";
import { useAgentChat } from "@/components/agents/AgentChatModal";
import { RELAY_AGENT, SYSTEM_AGENT_IDS } from "@/lib/agents/defaultTeam";
import { SKILL_PACKS } from "@/lib/skillPacks";
import { API_CATALOG } from "@/lib/apiCatalog";
import { useConnectorStore } from "@/store/connectorStore";
import { MODEL_LABELS, MODEL_TIERS, MODEL_TIER_COLOR } from "@/types";
import type { Agent, Skill } from "@/types";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { exportAgent, importRonakoFile } from "@/lib/exportImport";
import { useToastStore } from "@/store/toastStore";

type EditorTab = "config" | "prompt" | "skills" | "connectors";

// ─── Descriptions agents système ─────────────────────────────────────────────
const SYSTEM_DESCRIPTIONS: Record<string, string> = {
  relay: "**Relay** distille le contexte entre les agents (100-150 tokens ciblés). Réduit les coûts de 60-80%. Non modifiable.",
  ella: "**Ella** consolide tous les outputs de l'équipe en un document final cohérent.",
  ryo: "**Ryo** évalue le livrable /10 et identifie les points d'amélioration.",
  sam: "**Sam** produit la note technique structurée pour Claude Code.",
};

export function AgentStudio() {
  const {
    agents, addAgent, updateAgent, deleteAgent,
    consultants, addConsultant, updateConsultant,
    addSkill, updateSkill: _updateSkill, deleteSkill, toggleSkill,
    installSkillPack, getSkillsForAgent,
  } = useAgentStore();
  void _updateSkill;
  const openChat = useAgentChat((s) => s.openChat);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>("config");
  const [search, setSearch] = useState("");
  const [showSystemInfo, setShowSystemInfo] = useState<Agent | null>(null);
  const [showCreateConsultant, setShowCreateConsultant] = useState(false);
  const [showPacks, setShowPacks] = useState(false);

  // Agents normaux filtrés
  const userAgents = agents.filter((a) => !SYSTEM_AGENT_IDS.has(a.id));
  const systemCore = [RELAY_AGENT, ...agents.filter((a) => SYSTEM_AGENT_IDS.has(a.id) && a.id !== "relay")];
  const builtinConsultants = consultants.filter((c) => BUILTIN_CONSULTANT_IDS.has(c.id));
  const userConsultants = consultants.filter((c) => !BUILTIN_CONSULTANT_IDS.has(c.id));
  const allSidebarAgents = [...userAgents, ...userConsultants];

  const filtered = allSidebarAgents.filter(
    (a) => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.role.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedAgent = selectedId
    ? [...agents, ...consultants, ...systemCore, ...builtinConsultants].find((a) => a.id === selectedId) ?? null
    : null;

  const isSystemAgent = selectedAgent ? (SYSTEM_AGENT_IDS.has(selectedAgent.id) || BUILTIN_CONSULTANT_IDS.has(selectedAgent.id)) : false;
  const agentSkills = selectedAgent ? getSkillsForAgent(selectedAgent.id) : [];

  const handleSave = (data: Omit<Agent, "id">) => {
    if (!selectedId) return;
    if (userConsultants.find((c) => c.id === selectedId)) {
      updateConsultant(selectedId, data);
    } else {
      updateAgent(selectedId, data);
    }
  };

  const handleCreateConsultant = (data: Omit<Agent, "id">) => {
    const c = addConsultant({ ...data, isSystem: false });
    setSelectedId(c.id);
    setShowCreateConsultant(false);
  };

  return (
    <div className="flex h-full">
      {/* ── Sidebar gauche ──────────────────────────────────────────── */}
      <div className="w-60 flex flex-col border-r border-crystal/50 shrink-0 overflow-hidden">
        {/* Search + new agent */}
        <div className="p-3 border-b border-crystal/50 flex flex-col gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-silk/25 pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full bg-graphite border border-crystal rounded-lg pl-7 pr-3 py-1.5 text-xs text-silk placeholder-silk/25 focus:outline-none focus:border-electric/40" />
          </div>
          <Button variant="primary" size="sm" onClick={() => { addAgent({ name: "Nouvel agent", role: "Agent spécialisé", description: "", model: MODEL_TIERS.analyst, temperature: 70, systemPrompt: "", colors: ["#6366F1", "#8B5CF6"], tools: [], isSystem: false }); }}>
            <Plus size={12} /> Nouvel agent
          </Button>
        </div>

        {/* Liste agents */}
        <div className="flex-1 overflow-y-auto" data-tour="agent-grid">
          {filtered.length === 0 && !search && (
            <p className="text-[11px] text-silk/25 text-center py-4">Aucun agent</p>
          )}
          {filtered.map((agent) => (
            <SidebarItem key={agent.id} agent={agent} isSelected={selectedId === agent.id}
              onClick={() => { setSelectedId(agent.id); setActiveTab("config"); }} />
          ))}

          {/* Agents système (Relay, Ella, Ryo, Sam, Marcus) */}
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-1.5">
              <Lock size={9} className="text-silk/20" />
              <span className="text-[9px] text-silk/20 uppercase tracking-widest">Agents Système</span>
            </div>
          </div>
          {systemCore.map((agent) => (
            <SidebarItem key={agent.id} agent={agent} isSelected={selectedId === agent.id} isSystem
              onClick={() => { setSelectedId(agent.id); setActiveTab("config"); }} />
          ))}

          {/* Consultants (Nova, Idéation, Prompt Machine, Veille Tech) */}
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-electric/40">✦</span>
              <span className="text-[9px] text-electric/40 uppercase tracking-widest">Consultants</span>
            </div>
          </div>
          {builtinConsultants.map((agent) => (
            <SidebarItem key={agent.id} agent={agent} isSelected={selectedId === agent.id} isSystem
              onClick={() => { setSelectedId(agent.id); setActiveTab("config"); }} />
          ))}

          {/* Import */}
          <button onClick={async () => {
            const result = await importRonakoFile().catch(() => null);
            if (!result) return;
            if (!result.valid) { useToastStore.getState().error("Import invalide", "Checksum incorrect"); return; }
            if (result.file.type === "agent") {
              const { agent } = result.file as import("@/lib/exportImport").RonakoAgentFile;
              addAgent(agent);
              useToastStore.getState().success("Agent importé", agent.name ?? "");
            }
          }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-mystic/50 hover:text-mystic hover:bg-mystic/5 transition-all">
            📥 Importer un agent
          </button>

          {/* Créer consultant */}
          <button onClick={() => setShowCreateConsultant(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-electric/50 hover:text-electric hover:bg-electric/5 transition-all">
            <Plus size={10} /> Nouveau consultant
          </button>
        </div>
      </div>

      {/* ── Éditeur principal ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedAgent ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
            <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-crystal flex items-center justify-center">
              <Pencil size={18} className="text-silk/20" />
            </div>
            <p className="text-sm text-silk/35">Sélectionne un agent pour le modifier</p>
            <p className="text-xs text-silk/20">ou crée-en un nouveau</p>
          </div>
        ) : (
          <>
            {/* Header agent */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-crystal/50 shrink-0">
              <AgentAvatar colors={selectedAgent.colors as [string,string]} name={selectedAgent.name} size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-silk">{selectedAgent.name}</p>
                <p className="text-xs text-silk/40">{selectedAgent.role}</p>
              </div>
              {isSystemAgent && <Badge variant="ghost" className="text-[10px]">Non modifiable</Badge>}
              {!isSystemAgent && (
                <button
                  title="Exporter l'agent"
                  onClick={() => exportAgent(selectedAgent, agentSkills).catch(() => useToastStore.getState().error("Erreur export", ""))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-silk/25 hover:text-silk/60 hover:bg-crystal transition-all text-sm">
                  📤
                </button>
              )}
              <button onClick={() => openChat(selectedAgent)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-silk/30 hover:text-electric hover:bg-electric/10 transition-all">
                <MessageSquare size={14} />
              </button>
            </div>

            {/* Onglets */}
            <div className="flex border-b border-crystal/50 shrink-0">
              {(["config", "prompt", "skills", "connectors"] as EditorTab[]).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  {...(tab === "skills" ? { "data-tour": "skills-tab" } : tab === "connectors" ? { "data-tour": "connectors-tab" } : {})}
                  className={cn("flex-1 py-2.5 text-xs font-medium transition-colors capitalize",
                    activeTab === tab ? "text-electric border-b-2 border-electric -mb-px" : "text-silk/35 hover:text-silk/60")}>
                  {tab === "config" ? "⚙️ Config" : tab === "prompt" ? "📝 Prompt" : tab === "skills" ? "⚡ Skills" : "🔌 Connecteurs"}
                </button>
              ))}
            </div>

            {/* Contenu onglet */}
            <div className="flex-1 overflow-y-auto p-5">
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  {activeTab === "config" && (
                    <ConfigTab agent={selectedAgent} isSystem={isSystemAgent} onSave={handleSave} onDelete={(id) => { deleteAgent(id); setSelectedId(null); }} />
                  )}
                  {activeTab === "prompt" && (
                    <PromptTab agent={selectedAgent} isSystem={isSystemAgent} onSave={handleSave} />
                  )}
                  {activeTab === "skills" && (
                    <SkillsTab
                      agent={selectedAgent}
                      skills={agentSkills}
                      onToggle={toggleSkill}
                      onDelete={deleteSkill}
                      onInstallPack={installSkillPack}
                      onAddSkill={addSkill}
                      showPacks={showPacks}
                      setShowPacks={setShowPacks}
                    />
                  )}
                  {activeTab === "connectors" && (
                    <ConnectorsTab agent={selectedAgent} isSystem={isSystemAgent}
                      onAskNova={() => {
                        const nova = [...consultants].find((c) => c.id === "consultant-nova");
                        if (nova) openChat({ ...nova, systemPrompt: `${nova.systemPrompt}\n\nContexte : je configure ${selectedAgent.name} (${selectedAgent.role}).` });
                      }}
                      onUpdateAgent={(updates) => handleSave({ ...selectedAgent, ...updates })}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <Modal open={showCreateConsultant} onClose={() => setShowCreateConsultant(false)} title="Nouveau consultant" size="lg">
        <AgentForm initial={{ model: MODEL_TIERS.analyst, temperature: 60, colors: ["#6366F1", "#A259FF"], tools: [], isSystem: false }}
          onSave={handleCreateConsultant} onCancel={() => setShowCreateConsultant(false)} />
      </Modal>
      <Modal open={!!showSystemInfo} onClose={() => setShowSystemInfo(null)} title={showSystemInfo ? `${showSystemInfo.name} — Rôle` : ""} size="sm">
        {showSystemInfo && <MarkdownMessage content={SYSTEM_DESCRIPTIONS[showSystemInfo.id] ?? showSystemInfo.description} />}
      </Modal>
    </div>
  );
}

// ─── Sidebar item ─────────────────────────────────────────────────────────────
function SidebarItem({ agent, isSelected, isSystem, onClick }: { agent: Agent; isSelected: boolean; isSystem?: boolean; onClick: () => void }) {
  const handleClick = () => {
    onClick();
    if (agent.id === "sofia") document.dispatchEvent(new Event("tour-sofia-clicked"));
  };
  return (
    <button data-agent-id={agent.id} onClick={handleClick} className={cn(
      "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all",
      isSelected ? "bg-electric/10 border-r-2 border-electric" : "hover:bg-graphite-light",
      isSystem && "opacity-60",
    )}>
      <AgentAvatar colors={agent.colors as [string,string]} name={agent.name} size={26} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-silk truncate">{agent.name}</p>
        <p className="text-[10px] text-silk/35 truncate">{agent.role}</p>
      </div>
      {isSystem && <Lock size={9} className="text-silk/20 shrink-0" />}
    </button>
  );
}

// ─── Onglet Config ────────────────────────────────────────────────────────────
function ConfigTab({ agent, isSystem, onSave, onDelete }: {
  agent: Agent; isSystem: boolean;
  onSave: (d: Omit<Agent, "id">) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role);
  const [temp, setTemp] = useState(agent.temperature);
  const [model, setModel] = useState(agent.model);
  const [colors, setColors] = useState(agent.colors);
  const [pauseAfter, setPauseAfter] = useState(agent.pauseAfter ?? false);
  const [pauseMessage, setPauseMessage] = useState(agent.pauseMessage ?? "");

  const PRESETS: [string, string][] = [
    ["#F59E0B","#EF4444"], ["#10B981","#06B6D4"], ["#8B5CF6","#EC4899"],
    ["#007AFF","#A259FF"], ["#F97316","#FBBF24"], ["#0EA5E9","#10B981"],
    ["#64748B","#6366F1"], ["#EF4444","#F97316"],
  ];

  if (isSystem) return (
    <div className="text-xs text-silk/40 leading-relaxed bg-graphite-light border border-crystal rounded-xl p-4">
      <Lock size={14} className="text-silk/25 mb-2" />
      Cet agent est un composant système de Ronako. Sa configuration ne peut pas être modifiée.
      Ses skills et connecteurs peuvent être consultés dans les onglets correspondants.
    </div>
  );

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      {/* Avatar + nom */}
      <div className="flex items-center gap-4">
        <AgentAvatar colors={colors as [string,string]} name={name || "??"} size={56} />
        <div className="flex-1 flex flex-col gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom"
            className="bg-graphite-light border border-crystal rounded-xl px-3 py-2 text-sm text-silk placeholder-silk/30 focus:outline-none focus:border-electric/50" />
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Rôle"
            className="bg-graphite-light border border-crystal rounded-xl px-3 py-2 text-xs text-silk/70 placeholder-silk/30 focus:outline-none focus:border-electric/50" />
        </div>
      </div>

      {/* Couleurs */}
      <div>
        <p className="text-xs text-silk/40 mb-2">Couleur avatar</p>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map(([c1,c2]) => (
            <button key={c1+c2} onClick={() => setColors([c1,c2])}
              className={cn("w-8 h-8 rounded-full border-2 transition-all", colors[0]===c1 && colors[1]===c2 ? "border-white scale-110" : "border-transparent")}
              style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
          ))}
        </div>
      </div>

      {/* Modèle */}
      <div>
        <p className="text-xs text-silk/40 mb-2">Modèle IA</p>
        <div className="flex gap-2">
          {([MODEL_TIERS.orchestrator, MODEL_TIERS.analyst, MODEL_TIERS.specialist] as const).map((m) => (
            <button key={m} onClick={() => setModel(m)}
              className={cn("flex-1 py-2 px-3 rounded-xl text-xs font-medium border transition-all",
                model === m ? "bg-electric/15 border-electric/40 text-electric" : "border-crystal text-silk/40 hover:border-crystal-light")}
              style={model === m ? { borderColor: `${MODEL_TIER_COLOR[m]}40`, backgroundColor: `${MODEL_TIER_COLOR[m]}15`, color: MODEL_TIER_COLOR[m] } : {}}>
              {MODEL_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <Slider value={temp} onChange={setTemp} label="Température" color="electric" />

      {/* Pause après cet agent */}
      <div className="flex flex-col gap-2 pt-3 border-t border-crystal/30">
        <div className="flex items-center gap-2">
          <Toggle checked={pauseAfter} onChange={setPauseAfter} label="" />
          <span className="text-xs text-silk/70">Pause après cet agent</span>
          <InfoTooltip
            title="Pause après agent"
            description="La chaîne se met en pause une fois que cet agent a terminé. Tu peux relire son output et décider de continuer ou d'interrompre."
            size={11}
          />
        </div>
        {pauseAfter && (
          <input
            value={pauseMessage}
            onChange={(e) => setPauseMessage(e.target.value)}
            placeholder="Message de pause (optionnel)"
            className="bg-graphite-light border border-crystal rounded-xl px-3 py-2 text-xs text-silk/70 placeholder-silk/30 focus:outline-none focus:border-electric/50"
          />
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-crystal/50">
        <Button variant="danger" size="sm" onClick={() => onDelete(agent.id)}>
          <Trash2 size={12} /> Supprimer
        </Button>
        <Button variant="primary" size="sm" className="flex-1"
          onClick={() => onSave({ ...agent, name, role, temperature: temp, model, colors: colors as [string,string], pauseAfter, pauseMessage: pauseMessage || undefined })}>
          Sauvegarder
        </Button>
      </div>
    </div>
  );
}

// ─── Onglet Prompt ────────────────────────────────────────────────────────────
function PromptTab({ agent, isSystem, onSave }: { agent: Agent; isSystem: boolean; onSave: (d: Omit<Agent, "id">) => void }) {
  const [prompt, setPrompt] = useState(agent.systemPrompt);
  const tokenEstimate = Math.ceil(prompt.length / 3.8);

  if (isSystem) return (
    <div>
      <p className="text-xs text-silk/40 mb-2">Prompt système (lecture seule)</p>
      <pre className="text-xs text-silk/50 font-mono leading-relaxed whitespace-pre-wrap bg-graphite-light border border-crystal rounded-xl p-3 max-h-96 overflow-y-auto">{agent.systemPrompt}</pre>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="text-xs text-silk/40">Prompt système</p>
        <span className={cn("text-[10px] font-mono", tokenEstimate > 3500 ? "text-warning" : "text-silk/30")}>
          ~{tokenEstimate} tokens
        </span>
      </div>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
        rows={12}
        className="w-full bg-graphite-light border border-crystal rounded-xl px-4 py-3 text-xs text-silk font-mono leading-relaxed focus:outline-none focus:border-electric/50 resize-none" />
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => setPrompt(agent.systemPrompt)}>
          ↩️ Restaurer
        </Button>
        <Button variant="primary" size="sm" className="flex-1"
          onClick={() => onSave({ ...agent, systemPrompt: prompt })}>
          Sauvegarder le prompt
        </Button>
      </div>
    </div>
  );
}

// ─── Onglet Skills ────────────────────────────────────────────────────────────
function SkillsTab({ agent, skills, onToggle, onDelete, onInstallPack, onAddSkill, showPacks, setShowPacks }: {
  agent: Agent; skills: Skill[];
  onToggle: (id: string) => void; onDelete: (id: string) => void;
  onInstallPack: (id: string) => void;
  onAddSkill: (d: Omit<Skill, "id"|"createdAt"|"useCount"|"avgScoreImpact">) => Skill;
  showPacks: boolean; setShowPacks: (v: boolean) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillContent, setNewSkillContent] = useState("");
  const [newSkillInherit, setNewSkillInherit] = useState(false);

  const activeSkills = skills.filter((s) => s.isActive);
  const inactiveSkills = skills.filter((s) => !s.isActive);
  const compatiblePacks = SKILL_PACKS.filter((p) => p.skills.some((s) => s.agentIds.includes(agent.id)));

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      {/* Actifs */}
      {activeSkills.length > 0 && (
        <div>
          <p className="text-xs text-silk/40 uppercase tracking-widest mb-2">Actifs ({activeSkills.length}/5)</p>
          <div className="flex flex-col gap-2">
            {activeSkills.map((sk) => <SkillCard key={sk.id} skill={sk} onToggle={onToggle} onDelete={onDelete} />)}
          </div>
        </div>
      )}

      {/* Inactifs */}
      {inactiveSkills.length > 0 && (
        <div>
          <p className="text-xs text-silk/40 uppercase tracking-widest mb-2">Inactifs</p>
          <div className="flex flex-col gap-2 opacity-60">
            {inactiveSkills.map((sk) => <SkillCard key={sk.id} skill={sk} onToggle={onToggle} onDelete={onDelete} />)}
          </div>
        </div>
      )}

      {skills.length === 0 && (
        <div className="text-center py-8">
          <Zap size={20} className="mx-auto text-silk/15 mb-2" />
          <p className="text-xs text-silk/30">Aucun skill installé</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap pt-2 border-t border-crystal/50">
        <Button variant="glass" size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus size={12} /> Créer un skill
        </Button>
        <Button variant="glass" size="sm" onClick={() => setShowPacks(!showPacks)}>
          <Package size={12} /> Packs ({compatiblePacks.length})
        </Button>
      </div>

      {/* Inline create */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex flex-col gap-3 bg-graphite-light border border-crystal rounded-xl p-3">
            <input value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)} placeholder="Nom du skill"
              className="bg-graphite border border-crystal rounded-lg px-3 py-1.5 text-xs text-silk placeholder-silk/25 focus:outline-none focus:border-electric/40" />
            <textarea value={newSkillContent} onChange={(e) => setNewSkillContent(e.target.value)} rows={3}
              placeholder="Instructions spécifiques pour cet agent…"
              className="bg-graphite border border-crystal rounded-lg px-3 py-1.5 text-xs text-silk placeholder-silk/25 focus:outline-none focus:border-electric/40 resize-none" />
            {agent.id === "marcus" && (
              <Toggle checked={newSkillInherit} onChange={setNewSkillInherit} label="🌐 Hériter à tous les agents" size="sm" />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Annuler</Button>
              <Button variant="primary" size="sm" disabled={!newSkillName.trim()} onClick={() => {
                onAddSkill({ name: newSkillName, description: "", content: newSkillContent, agentIds: [agent.id], isActive: true, isTemporary: false, inheritToAll: newSkillInherit, triggerKeywords: [], createdBy: "user" });
                setNewSkillName(""); setNewSkillContent(""); setShowCreate(false);
              }}>Créer</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Packs */}
      <AnimatePresence>
        {showPacks && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex flex-col gap-2">
            <p className="text-xs text-silk/40">Packs compatibles avec {agent.name}</p>
            {compatiblePacks.map((pack) => (
              <div key={pack.id} className="flex items-center gap-3 p-3 bg-graphite-light border border-crystal rounded-xl">
                <span className="text-xl">{pack.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-silk">{pack.name}</p>
                  <p className="text-[10px] text-silk/40">{pack.skills.filter((s) => s.agentIds.includes(agent.id)).length} skill(s) pour toi</p>
                </div>
                <Button variant="glass" size="sm" onClick={() => onInstallPack(pack.id)}>
                  Installer
                </Button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SkillCard({ skill, onToggle, onDelete }: { skill: Skill; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-graphite-light border border-crystal rounded-xl group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-xs font-medium text-silk">{skill.name}</p>
          {skill.inheritToAll && <span className="text-[9px] text-electric/60">🌐 universel</span>}
          {skill.isTemporary && <span className="text-[9px] text-warning/60">⏱ temp</span>}
        </div>
        <p className="text-[10px] text-silk/40 line-clamp-2 leading-relaxed">{skill.content.slice(0, 80)}…</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => onToggle(skill.id)} className="text-silk/30 hover:text-silk/70 transition-colors">
          {skill.isActive ? <ToggleRight size={16} className="text-electric" /> : <ToggleLeft size={16} />}
        </button>
        {skill.createdBy !== "system" && (
          <button onClick={() => onDelete(skill.id)} className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-silk/25 hover:text-danger transition-all">
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Onglet Connecteurs ───────────────────────────────────────────────────────
function ConnectorsTab({ agent, isSystem, onAskNova, onUpdateAgent }: {
  agent: Agent; isSystem: boolean;
  onAskNova: () => void;
  onUpdateAgent: (updates: Partial<Agent>) => void;
}) {
  const { getKey } = useConnectorStore();
  const [search, setSearch] = useState("");

  const nativeTools = [
    { id: "web_search", label: "Recherche Web", icon: "🔍", desc: "Tavily / web search" },
    { id: "image_gen",  label: "Génération images", icon: "🎨", desc: "DALL-E / Flux" },
    { id: "file_read",  label: "Lecture fichiers", icon: "📂", desc: "Dossier projet connecté" },
  ] as const;

  const toggleTool = (toolId: string) => {
    const tools = agent.tools ?? [];
    const newTools = tools.includes(toolId as never)
      ? tools.filter((t) => t !== toolId)
      : [...tools, toolId as never];
    onUpdateAgent({ tools: newTools as Agent["tools"] });
  };

  const toggleConnector = (connId: string) => {
    const conns = agent.connectors ?? [];
    const newConns = conns.includes(connId) ? conns.filter((c) => c !== connId) : [...conns, connId];
    onUpdateAgent({ connectors: newConns });
  };

  // APIs configurées (avec clé) + filtre search
  const configuredApis = API_CATALOG.filter((api) => {
    const hasKey = !!getKey(api.keyField);
    const matchSearch = !search || api.name.toLowerCase().includes(search.toLowerCase());
    return hasKey && matchSearch;
  });

  const unconfiguredApis = API_CATALOG.filter((api) => {
    const hasKey = !!getKey(api.keyField);
    const matchSearch = !search || api.name.toLowerCase().includes(search.toLowerCase());
    return !hasKey && matchSearch;
  }).slice(0, 6); // Montrer seulement 6 non configurées

  return (
    <div className="flex flex-col gap-5">
      {/* Outils natifs */}
      <div>
        <p className="text-[10px] text-silk/35 uppercase tracking-widest mb-2">Outils natifs Anthropic</p>
        <div className="flex flex-col gap-1.5">
          {nativeTools.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-2.5 bg-graphite-light border border-crystal rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-base">{t.icon}</span>
                <div>
                  <p className="text-xs font-medium text-silk/70">{t.label}</p>
                  <p className="text-[10px] text-silk/35">{t.desc}</p>
                </div>
              </div>
              <Toggle checked={agent.tools?.includes(t.id) ?? false} onChange={() => toggleTool(t.id)} size="sm" disabled={isSystem} />
            </div>
          ))}
        </div>
      </div>

      {/* APIs configurées */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-silk/35 uppercase tracking-widest">APIs connectées</p>
          <span className="text-[9px] text-silk/20">{configuredApis.length} disponibles</span>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrer les APIs…"
          className="w-full bg-graphite-light border border-crystal/50 rounded-lg px-2.5 py-1.5 text-xs text-silk/60 placeholder-silk/20 focus:outline-none focus:border-electric/40 mb-2" />

        {configuredApis.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-silk/30">Aucune API configurée.</p>
            <button onClick={() => document.dispatchEvent(new CustomEvent("navigate-packs"))}
              className="text-[10px] text-electric/60 hover:text-electric mt-1 transition-colors">
              Configurer dans le Pack Manager →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {configuredApis.map((api) => {
              const isActive = agent.connectors?.includes(api.id) ?? false;
              return (
                <div key={api.id} className={cn("flex items-center gap-3 p-2.5 border rounded-xl transition-all",
                  isActive ? "border-success/30 bg-success/5" : "bg-graphite-light border-crystal")}>
                  <span className="text-base shrink-0">{api.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-silk/70">{api.name}</p>
                      {api.hasToolDef && <span className="text-[8px] bg-electric/10 text-electric px-1 py-0.5 rounded">⚡ Tool Use</span>}
                      <CheckCircle2 size={10} className="text-success/60" />
                    </div>
                    <p className="text-[9px] text-silk/30 truncate">{api.description}</p>
                  </div>
                  <Toggle checked={isActive} onChange={() => toggleConnector(api.id)} size="sm" disabled={isSystem} />
                </div>
              );
            })}
          </div>
        )}

        {/* Aperçu des APIs non configurées */}
        {unconfiguredApis.length > 0 && (
          <div className="mt-3">
            <p className="text-[9px] text-silk/20 mb-1.5">Non configurées — active-les dans Pack Manager :</p>
            <div className="flex flex-wrap gap-1.5">
              {unconfiguredApis.map((api) => (
                <button key={api.id}
                  onClick={() => document.dispatchEvent(new CustomEvent("navigate-packs"))}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-graphite-light border border-crystal/30 text-[9px] text-silk/30 hover:text-silk/60 transition-colors">
                  <span>{api.icon}</span> {api.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nova */}
      <button onClick={onAskNova}
        className="flex items-center gap-3 p-3 rounded-xl border border-electric/20 bg-electric/5 hover:border-electric/40 transition-all text-left">
        <span className="text-xl">✦</span>
        <div>
          <p className="text-xs font-semibold text-electric/80">Demander à Nova</p>
          <p className="text-[9px] text-silk/40">Recommandations connecteurs pour {agent.name}</p>
        </div>
        <ChevronRight size={14} className="text-silk/20 ml-auto" />
      </button>
    </div>
  );
}
