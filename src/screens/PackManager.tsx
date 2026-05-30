import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Download, Trash2, Check, ChevronDown, ChevronRight,
  Plus, Copy, Key, Eye, EyeOff, Zap, Globe, Server,
  ExternalLink, Search, Pencil, ToggleLeft, ToggleRight,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { SKILL_PACKS } from "@/lib/skillPacks";
import { useAgentStore } from "@/store/agentStore";
import { useConnectorStore, type CustomHttpConnector } from "@/store/connectorStore";
import { API_CATALOG, CATEGORY_META, type ApiEntry, type ApiCategory } from "@/lib/apiCatalog";
import { MCP_CATALOG, type McpServer } from "@/lib/mcpCatalog";
import type { SkillPack } from "@/types";
import { Button } from "@/components/ui/Button";

type Tab = "skills" | "apis" | "mcp" | "custom";

export function PackManager() {
  const [tab, setTab] = useState<Tab>("skills");
  const { loadAllKnownKeys } = useConnectorStore();

  // Charger toutes les clés connues au montage
  useEffect(() => { void loadAllKnownKeys(); }, [loadAllKnownKeys]);

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "skills", label: "Skills",      icon: "⚡" },
    { id: "apis",   label: "APIs",         icon: "🔌" },
    { id: "mcp",    label: "MCP",          icon: "🤖" },
    { id: "custom", label: "HTTP Custom",  icon: "⚙️" },
  ];

  return (
    <div className="h-full flex flex-col bg-onyx overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-crystal/40 shrink-0">
        <div className="flex items-center gap-2.5">
          <Package size={18} className="text-electric" />
          <div>
            <h1 className="text-base font-bold text-silk">Pack Manager</h1>
            <p className="text-[10px] text-silk/30">Hub unique — Skills · APIs · MCP · Custom</p>
          </div>
        </div>
        <div className="flex gap-1 bg-graphite rounded-xl p-0.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all flex items-center gap-1",
                tab === t.id ? "bg-crystal text-silk" : "text-silk/40 hover:text-silk/70",
              )}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <AnimatePresence mode="wait">
          {tab === "skills" && <SkillsTab key="skills" />}
          {tab === "apis"   && <ApisTab key="apis" />}
          {tab === "mcp"    && <McpTab key="mcp" />}
          {tab === "custom" && <CustomTab key="custom" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Onglet Skills — 3 sous-onglets ───────────────────────────────────────────

type SkillSubTab = "packs" | "library" | "create";

function SkillsTab() {
  const [subTab, setSubTab] = useState<SkillSubTab>("packs");
  const [editingSkill, setEditingSkill] = useState<import("@/types").Skill | null>(null);
  const [showSkillEditor, setShowSkillEditor] = useState(false);
  const { addSkill, updateSkill } = useAgentStore();

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex flex-col gap-3">
      {/* Sous-onglets */}
      <div className="flex gap-1 bg-graphite rounded-xl p-0.5 self-start">
        {([["packs","📦 Packs"],["library","📚 Bibliothèque"],["create","✏️ Créer"]] as [SkillSubTab,string][]).map(([v,l]) => (
          <button key={v} onClick={() => setSubTab(v)}
            className={cn("px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all",
              subTab === v ? "bg-crystal text-silk" : "text-silk/40 hover:text-silk/70")}>
            {l}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {subTab === "packs" && (
          <motion.div key="packs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-3">
            <PacksSubTab />
          </motion.div>
        )}
        {subTab === "library" && (
          <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-3">
            <LibrarySubTab
              onEdit={(sk) => { setEditingSkill(sk); setShowSkillEditor(true); setSubTab("create"); }} />
          </motion.div>
        )}
        {subTab === "create" && (
          <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SkillEditorForm
              skill={editingSkill}
              onSave={(data) => {
                if (editingSkill) updateSkill(editingSkill.id, data);
                else addSkill({ ...data, createdBy: "user" });
                setShowSkillEditor(false); setEditingSkill(null); setSubTab("library");
              }}
              onCancel={() => { setEditingSkill(null); setShowSkillEditor(false); setSubTab("library"); }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {showSkillEditor && false /* handled via subTab */}
    </motion.div>
  );
}

// ── Sous-onglet Packs ─────────────────────────────────────────────────────────

function PacksSubTab() {
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [showPackForm, setShowPackForm] = useState(false);
  const [editingPack, setEditingPack] = useState<SkillPack | null>(null);
  const [packName, setPackName] = useState("");
  const [packIcon, setPackIcon] = useState("📦");
  const [packDesc, setPackDesc] = useState("");
  const { customPacks, addCustomPack, updateCustomPack, deleteCustomPack, installCustomPack, skills } = useAgentStore();

  const handleSavePack = () => {
    if (!packName.trim()) return;
    if (editingPack) {
      updateCustomPack(editingPack.id, { name: packName, icon: packIcon, description: packDesc });
    } else {
      addCustomPack({ name: packName, icon: packIcon, description: packDesc, sector: "custom", skills: [] });
    }
    setShowPackForm(false); setEditingPack(null); setPackName(""); setPackIcon("📦"); setPackDesc("");
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Créer pack custom */}
      <AnimatePresence>
        {showPackForm ? (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-graphite border border-electric/30 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-silk">{editingPack ? "Modifier le pack" : "Nouveau pack"}</p>
            <div className="flex gap-2">
              <input value={packIcon} onChange={(e) => setPackIcon(e.target.value)}
                className="w-12 text-center input-sm" placeholder="📦" />
              <input value={packName} onChange={(e) => setPackName(e.target.value)}
                className="flex-1 input-sm" placeholder="Nom du pack" />
            </div>
            <input value={packDesc} onChange={(e) => setPackDesc(e.target.value)}
              className="input-sm" placeholder="Description" />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setShowPackForm(false); setEditingPack(null); }}>Annuler</Button>
              <Button variant="primary" size="sm" disabled={!packName.trim()} onClick={handleSavePack}>Sauver</Button>
            </div>
          </motion.div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setShowPackForm(true)}
            className="w-full border-dashed border-crystal/50">
            <Plus size={12} /> Créer un pack custom
          </Button>
        )}
      </AnimatePresence>

      {/* Packs custom */}
      {customPacks.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-silk/30 uppercase tracking-widest">Mes packs ({customPacks.length})</p>
          {customPacks.map((pack) => {
            const packSkillIds = pack.skills.map((s) => s.id);
            const installedCount = skills.filter((sk) => packSkillIds.includes(sk.id)).length;
            return (
              <div key={pack.id} className="bg-graphite border border-crystal/50 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">{pack.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-silk">{pack.name}</p>
                  <p className="text-[10px] text-silk/40">{pack.description || "Pack custom"} · {pack.skills.length} skills</p>
                  {installedCount > 0 && <span className="text-[8px] bg-electric/15 text-electric px-1.5 py-0.5 rounded-full">Installé</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => installCustomPack(pack.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-electric/60 hover:text-electric hover:bg-electric/10 transition-all" title="Installer">
                    <Download size={13} />
                  </button>
                  <button onClick={() => { setEditingPack(pack); setPackName(pack.name); setPackIcon(pack.icon); setPackDesc(pack.description); setShowPackForm(true); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/25 hover:text-silk/60 transition-all">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => deleteCustomPack(pack.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/40 hover:text-red-400 hover:bg-red-400/10 transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Packs prédéfinis */}
      <p className="text-[10px] text-silk/30 uppercase tracking-widest mt-1">Packs officiels</p>
      {SKILL_PACKS.map((pack) => (
        <SkillPackCard key={pack.id} pack={pack}
          expanded={expandedPack === pack.id}
          onToggle={() => setExpandedPack(expandedPack === pack.id ? null : pack.id)} />
      ))}
    </div>
  );
}

// ── Sous-onglet Bibliothèque ──────────────────────────────────────────────────

function LibrarySubTab({ onEdit }: { onEdit: (sk: import("@/types").Skill) => void }) {
  const [search, setSearch] = useState("");
  const [filterAgent, setFilterAgent] = useState("all");
  const [githubUrl, setGithubUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const { skills, addSkill, deleteSkill } = useAgentStore();
  const { agents } = useAgentStore();

  const handleImportGithub = async () => {
    if (!githubUrl.trim()) return;
    setImporting(true);
    try {
      const raw = githubUrl
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/blob/", "/");
      // Via Rust pour respecter la règle no-fetch JS
      const text = await invoke<string>("http_custom_call", {
        url: raw, method: "GET", headers: [], body: null,
      });
      const lines = text.split("\n");
      const name = lines.find((l) => l.startsWith("# "))?.slice(2).trim() ?? "Skill importé";
      const description = lines.find((l) => !l.startsWith("#") && l.trim())?.trim() ?? "";
      addSkill({ name, description, content: text, agentIds: [], isActive: true, isTemporary: false, inheritToAll: false, triggerKeywords: [], createdBy: "user" });
      setGithubUrl("");
    } catch (e) { alert(`Erreur : ${String(e)}`); }
    finally { setImporting(false); }
  };

  const filtered = skills.filter((sk) => {
    const matchSearch = !search || sk.name.toLowerCase().includes(search.toLowerCase());
    const matchAgent = filterAgent === "all" || sk.agentIds.includes(filterAgent);
    return matchSearch && matchAgent;
  });

  const nonSystemAgents = agents.filter((a) => !a.isSystem);

  return (
    <div className="flex flex-col gap-3">
      {/* Import GitHub */}
      <div className="flex gap-2">
        <input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)}
          placeholder="URL GitHub fichier .md (skill)…"
          className="flex-1 bg-graphite border border-crystal rounded-lg px-2.5 py-1.5 text-xs text-silk/60 placeholder-silk/20 focus:outline-none focus:border-electric/40" />
        <Button variant="ghost" size="sm" loading={importing} disabled={!githubUrl.trim()} onClick={handleImportGithub}>
          <Download size={12} /> Importer
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-silk/25 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un skill…"
            className="w-full bg-graphite border border-crystal rounded-lg pl-7 pr-3 py-1.5 text-xs text-silk/60 placeholder-silk/20 focus:outline-none focus:border-electric/40" />
        </div>
        <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}
          className="bg-graphite border border-crystal rounded-lg px-2 py-1.5 text-xs text-silk/60 focus:outline-none">
          <option value="all">Tous les agents</option>
          {nonSystemAgents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <p className="text-[10px] text-silk/30">{filtered.length} skill{filtered.length > 1 ? "s" : ""}</p>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-silk/30 text-xs">
          {skills.length === 0 ? "Aucun skill installé. Installe un pack ou crée un skill." : "Aucun résultat."}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map((skill) => (
            <div key={skill.id} className={cn(
              "flex items-start gap-3 p-3 rounded-xl border transition-all group",
              skill.isActive ? "bg-electric/5 border-electric/20" : "bg-graphite border-crystal/50",
            )}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-medium text-silk">{skill.name}</p>
                  {skill.isActive && <span className="text-[8px] bg-electric/15 text-electric px-1.5 py-0.5 rounded-full">Actif</span>}
                  {skill.inheritToAll && <span className="text-[8px] bg-mystic/15 text-mystic px-1.5 py-0.5 rounded-full">🌐</span>}
                  {skill.createdBy === "system" && <span className="text-[8px] text-silk/25">pack</span>}
                </div>
                <p className="text-[10px] text-silk/40 mt-0.5 line-clamp-1">{skill.description}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {skill.agentIds.slice(0, 5).map((aid) => (
                    <span key={aid} className="text-[8px] bg-crystal/40 text-silk/40 px-1.5 py-0.5 rounded-full">{aid}</span>
                  ))}
                  {skill.agentIds.length === 0 && <span className="text-[8px] text-warning/40">Aucun agent assigné</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => onEdit(skill)}
                  className="w-6 h-6 rounded flex items-center justify-center text-silk/25 hover:text-electric/60">
                  <Pencil size={11} />
                </button>
                <button onClick={() => deleteSkill(skill.id)}
                  className="w-6 h-6 rounded flex items-center justify-center text-silk/20 hover:text-danger">
                  <Trash2 size={11} />
                </button>
                <button onClick={() => useAgentStore.getState().toggleSkill(skill.id)}
                  className="text-silk/30 hover:text-silk/70">
                  {skill.isActive ? <ToggleRight size={16} className="text-electric" /> : <ToggleLeft size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Éditeur de skill ──────────────────────────────────────────────────────────

function SkillEditorForm({ skill, onSave, onCancel }: {
  skill: import("@/types").Skill | null;
  onSave: (data: Omit<import("@/types").Skill, "id" | "createdAt" | "useCount" | "avgScoreImpact" | "createdBy">) => void;
  onCancel: () => void;
}) {
  const { agents } = useAgentStore();
  const [name, setName] = useState(skill?.name ?? "");
  const [description, setDescription] = useState(skill?.description ?? "");
  const [content, setContent] = useState(skill?.content ?? "");
  const [agentIds, setAgentIds] = useState<string[]>(skill?.agentIds ?? []);
  const [inheritToAll, setInheritToAll] = useState(skill?.inheritToAll ?? false);
  const [keywords, setKeywords] = useState((skill?.triggerKeywords ?? []).join(", "));

  const toggleAgent = (id: string) =>
    setAgentIds((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);

  const nonSystemAgents = agents.filter((a) => !a.isSystem);

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-graphite border border-electric/30 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-xs font-semibold text-silk">{skill ? "Modifier le skill" : "Nouveau skill"}</p>

      <input value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Nom du skill" className="input-sm" />
      <input value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder="Description courte" className="input-sm" />
      <textarea value={content} onChange={(e) => setContent(e.target.value)}
        placeholder="Contenu injecté dans le prompt de l'agent (instructions, connaissances sectorielles)…"
        rows={5} className="input-sm resize-none" />
      <input value={keywords} onChange={(e) => setKeywords(e.target.value)}
        placeholder="Mots-clés déclencheurs (séparés par virgule)" className="input-sm" />

      <div>
        <p className="text-[10px] text-silk/40 mb-1.5">Assigner aux agents :</p>
        <div className="flex flex-wrap gap-1.5">
          {nonSystemAgents.map((a) => (
            <button key={a.id} onClick={() => toggleAgent(a.id)}
              className={cn("px-2 py-0.5 rounded-lg text-[10px] border transition-all",
                agentIds.includes(a.id) ? "border-electric/40 bg-electric/10 text-electric" : "border-crystal text-silk/40 hover:text-silk/60")}>
              {a.name}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-silk/60 cursor-pointer">
        <input type="checkbox" checked={inheritToAll} onChange={(e) => setInheritToAll(e.target.checked)}
          className="accent-electric" />
        🌐 Universel — injecté dans tous les agents de la chaîne
      </label>

      <div className="flex gap-2 justify-end pt-1 border-t border-crystal/30">
        <Button variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
        <Button variant="primary" size="sm" disabled={!name.trim() || !content.trim()}
          onClick={() => onSave({
            name, description, content, agentIds, inheritToAll, isActive: true, isTemporary: false,
            triggerKeywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
            sector: undefined,
          })}>
          {skill ? "Sauvegarder" : "Créer"}
        </Button>
      </div>
    </motion.div>
  );
}

// ── Onglet APIs ───────────────────────────────────────────────────────────────

function ApisTab() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ApiCategory | "all">("all");
  const { getKey, setKey } = useConnectorStore();

  const categories = ["all", ...Object.keys(CATEGORY_META)] as Array<ApiCategory | "all">;

  const filtered = API_CATALOG.filter((api) => {
    const matchCat = activeCategory === "all" || api.category === activeCategory;
    const matchSearch = !search || api.name.toLowerCase().includes(search.toLowerCase())
      || api.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const configured = API_CATALOG.filter((a) => !!getKey(a.keyField)).length;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex flex-col gap-4">
      {/* Résumé */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-silk/40">
          {configured} / {API_CATALOG.length} APIs configurées · Les clés sont stockées dans le trousseau OS.
        </p>
        <span className="text-[10px] text-success/60 font-medium">🔒 Chiffré OS</span>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-silk/25 pointer-events-none" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une API…"
          className="w-full bg-graphite border border-crystal rounded-xl pl-8 pr-3 py-2 text-xs text-silk placeholder-silk/25 focus:outline-none focus:border-electric/50" />
      </div>

      {/* Catégories */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all",
              activeCategory === cat
                ? "bg-electric/15 text-electric"
                : "bg-graphite border border-crystal text-silk/40 hover:text-silk/60",
            )}>
            {cat === "all" ? "Toutes" : `${CATEGORY_META[cat as ApiCategory].icon} ${CATEGORY_META[cat as ApiCategory].label}`}
          </button>
        ))}
      </div>

      {/* Liste APIs */}
      <div className="flex flex-col gap-2">
        {filtered.map((api) => (
          <ApiCard key={api.id} api={api}
            currentKey={getKey(api.keyField)}
            onSave={(val) => void setKey(api.keyField, val)} />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-silk/30 text-center py-8">Aucune API ne correspond à ta recherche.</p>
        )}
      </div>
    </motion.div>
  );
}

function ApiCard({ api, currentKey, onSave }: { api: ApiEntry; currentKey: string; onSave: (v: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [keyInput, setKeyInput] = useState(currentKey);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasKey = !!currentKey;
  const catMeta = CATEGORY_META[api.category];

  const handleSave = async () => {
    setSaving(true);
    onSave(keyInput);
    setTimeout(() => setSaving(false), 600);
  };

  return (
    <div className={cn(
      "rounded-xl border transition-all",
      hasKey ? "border-electric/30 bg-electric/3" : "border-crystal/50 bg-graphite",
    )}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="text-xl w-8 shrink-0 text-center">{api.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-silk">{api.name}</span>
            <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full bg-graphite-light", catMeta.color)}>
              {catMeta.icon} {catMeta.label}
            </span>
            {api.hasToolDef && (
              <span className="text-[9px] bg-success/15 text-success px-1.5 py-0.5 rounded-full">⚡ Tool Use</span>
            )}
            {hasKey ? (
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Check size={8} strokeWidth={3} /> Actif
              </span>
            ) : (
              <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full">Clé manquante</span>
            )}
          </div>
          <p className="text-[10px] text-silk/40 mt-0.5">{api.description}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] text-silk/25">{api.pricing}</span>
          <button onClick={() => setExpanded(!expanded)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/30 hover:text-silk/60 hover:bg-crystal transition-all">
            {expanded ? <ChevronDown size={13} /> : <Key size={12} />}
          </button>
          {api.docsUrl && (
            <a href={api.docsUrl} target="_blank" rel="noreferrer"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/20 hover:text-silk/50 hover:bg-crystal transition-all">
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {/* Key config */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-crystal/30 mx-4 mb-3 pt-3">
              <div className="flex gap-2 items-center">
                <div className="flex-1 relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder={`Clé API ${api.name}…`}
                    className="w-full bg-graphite-light border border-crystal/60 rounded-lg px-3 py-1.5 text-xs text-silk/70 placeholder-silk/20 focus:outline-none focus:border-electric/50 pr-8"
                  />
                  <button onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-silk/25 hover:text-silk/60 transition-colors">
                    {showKey ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                </div>
                <Button variant="primary" size="sm" loading={saving}
                  disabled={!keyInput.trim()}
                  onClick={handleSave}>
                  <Check size={11} /> Sauver
                </Button>
                {hasKey && (
                  <button onClick={() => { onSave(""); setKeyInput(""); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-all">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Onglet MCP ────────────────────────────────────────────────────────────────

interface CustomMcpEntry { id: string; name: string; description: string; package: string; icon: string }

function McpTab() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterOfficial, setFilterOfficial] = useState<"all" | "official" | "community">("all");
  const [customMcps, setCustomMcps] = useState<CustomMcpEntry[]>([]);
  const [githubUrl, setGithubUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  const handleImportMcp = async () => {
    if (!githubUrl.trim()) return;
    setImporting(true); setImportError("");
    try {
      // Extraire owner/repo depuis l'URL GitHub
      const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) throw new Error("URL GitHub invalide (format: github.com/owner/repo)");
      const [, owner, repo] = match;
      const repoClean = repo.replace(/\.git$/, "").replace(/[?#].*/, "");

      // Essayer de lire package.json pour obtenir le vrai nom npm
      let pkgName = `${owner}/${repoClean}`;
      try {
        const pkgJson = await invoke<string>("http_custom_call", {
          url: `https://raw.githubusercontent.com/${owner}/${repoClean}/main/package.json`,
          method: "GET", headers: [], body: null,
        });
        const pkg = JSON.parse(pkgJson);
        if (pkg.name) pkgName = pkg.name;
      } catch { /* package.json absent, on utilise le nom du repo */ }

      // Lire README pour la description
      let description = `Serveur MCP ${repoClean}`;
      try {
        const readme = await invoke<string>("http_custom_call", {
          url: `https://raw.githubusercontent.com/${owner}/${repoClean}/main/README.md`,
          method: "GET", headers: [], body: null,
        });
        const firstLine = readme.split("\n").find((l) => !l.startsWith("#") && l.trim());
        if (firstLine) description = firstLine.trim().slice(0, 120);
      } catch { /* README absent */ }

      setCustomMcps((prev) => [...prev, {
        id: `mcp-custom-${Date.now()}`,
        name: repoClean,
        description,
        package: `npx -y ${pkgName}`,
        icon: "🔧",
      }]);
      setGithubUrl("");
    } catch (e) { setImportError(String(e)); }
    finally { setImporting(false); }
  };

  const filtered = [...MCP_CATALOG].filter((s) => {
    if (filterOfficial === "official") return s.official;
    if (filterOfficial === "community") return !s.official;
    return true;
  });

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex flex-col gap-4">
      <div className="bg-electric/5 border border-electric/20 rounded-xl px-4 py-3">
        <p className="text-xs text-silk/70 leading-relaxed">
          <span className="font-semibold text-electric">MCP (Model Context Protocol)</span> est le standard Anthropic
          pour connecter des outils à Claude. Copie la commande npx et lance-la dans ton terminal.
          Chaque serveur expose ses outils automatiquement aux agents.
        </p>
      </div>

      {/* Import depuis GitHub */}
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <input value={githubUrl} onChange={(e) => { setGithubUrl(e.target.value); setImportError(""); }}
            placeholder="URL GitHub d'un serveur MCP (github.com/user/repo)…"
            className="flex-1 bg-graphite border border-crystal rounded-lg px-2.5 py-1.5 text-xs text-silk/60 placeholder-silk/20 focus:outline-none focus:border-electric/40" />
          <Button variant="ghost" size="sm" loading={importing} disabled={!githubUrl.trim()} onClick={handleImportMcp}>
            <Download size={12} /> Importer
          </Button>
        </div>
        {importError && <p className="text-[10px] text-danger/70">{importError}</p>}
      </div>

      {/* Serveurs importés */}
      {customMcps.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-silk/30 uppercase tracking-widest">Importés</p>
          {customMcps.map((s) => (
            <div key={s.id} className="bg-graphite border border-crystal/50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-silk">{s.name}</p>
                  <p className="text-[10px] text-silk/40 truncate">{s.description}</p>
                  <code className="text-[9px] text-electric/60 font-mono">{s.package}</code>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => { navigator.clipboard.writeText(s.package); setCopiedId(s.id); setTimeout(() => setCopiedId(null), 2000); }}
                    className="flex items-center gap-1 text-[9px] text-silk/30 hover:text-silk/60 border border-crystal/40 rounded-lg px-2 py-0.5">
                    {copiedId === s.id ? <><Check size={9} className="text-success" /> Copié</> : <><Copy size={9} /> Copier</>}
                  </button>
                  <button onClick={() => setCustomMcps((p) => p.filter((m) => m.id !== s.id))}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-red-400/40 hover:text-red-400 hover:bg-red-400/10">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        {(["all", "official", "community"] as const).map((f) => (
          <button key={f} onClick={() => setFilterOfficial(f)}
            className={cn("px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all",
              filterOfficial === f ? "bg-electric/15 text-electric" : "bg-graphite border border-crystal text-silk/40 hover:text-silk/60")}>
            {f === "all" ? "Tous" : f === "official" ? "✅ Officiels" : "🌍 Communauté"}
          </button>
        ))}
        <span className="text-[10px] text-silk/20 self-center ml-auto">{MCP_CATALOG.length} serveurs</span>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((server) => (
          <McpCard key={server.id} server={server}
            copied={copiedId === server.id}
            onCopy={() => copy(server.id, server.package)} />
        ))}
      </div>
    </motion.div>
  );
}

function McpCard({ server, copied, onCopy }: { server: McpServer; copied: boolean; onCopy: () => void }) {
  return (
    <div className="bg-graphite border border-crystal/50 rounded-xl px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">{server.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-medium text-silk">{server.name}</span>
            <span className="text-[9px] bg-graphite-light text-silk/40 px-1.5 py-0.5 rounded-full">{server.category}</span>
            {server.official && <span className="text-[9px] bg-electric/10 text-electric px-1.5 py-0.5 rounded-full">Officiel</span>}
            <span className="text-[9px] text-silk/20">⭐ {server.stars}</span>
          </div>
          <p className="text-[10px] text-silk/50 mb-2">{server.description}</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {server.useCases.map((uc) => (
              <span key={uc} className="text-[9px] bg-crystal/30 text-silk/40 px-1.5 py-0.5 rounded-full">{uc}</span>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-graphite-light rounded-lg px-2.5 py-1.5 border border-crystal/40">
            <code className="text-[10px] text-electric/70 font-mono flex-1 truncate">{server.package}</code>
            <button onClick={onCopy}
              className="flex items-center gap-1 text-[9px] text-silk/30 hover:text-silk/70 transition-colors shrink-0">
              {copied ? <><Check size={10} className="text-success" /> Copié</> : <><Copy size={10} /> Copier</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Onglet Custom HTTP ────────────────────────────────────────────────────────

function CustomTab() {
  const { customConnectors, addCustomConnector, deleteCustomConnector } = useConnectorStore();
  const [showForm, setShowForm] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; result: string; ok: boolean } | null>(null);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex flex-col gap-4">
      <div className="bg-graphite border border-crystal/40 rounded-xl px-4 py-3">
        <p className="text-xs text-silk/60 leading-relaxed">
          Connecte n'importe quelle API REST — même celles qui ne sont pas dans le catalogue.
          L'agent pourra l'appeler comme un outil pendant l'exécution de la chaîne.
        </p>
      </div>

      {/* Form ajout */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}>
            <CustomConnectorForm
              onSave={(data) => { addCustomConnector(data); setShowForm(false); }}
              onCancel={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {!showForm && (
        <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}
          className="w-full border-dashed border-crystal/50 hover:border-electric/30">
          <Plus size={12} /> Ajouter un connecteur HTTP custom
        </Button>
      )}

      {/* Liste */}
      {customConnectors.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <Globe size={24} className="text-silk/15 mx-auto mb-2" />
          <p className="text-xs text-silk/30">Aucun connecteur custom pour l'instant.</p>
          <p className="text-[10px] text-silk/20 mt-1">Ajoute Stripe, Airtable, ta propre API…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {customConnectors.map((c) => (
            <CustomConnectorCard key={c.id} connector={c}
              testing={testing === c.id}
              testResult={testResult?.id === c.id ? testResult : null}
              onTest={async () => {
                setTesting(c.id);
                setTestResult(null);
                try {
                  const { invoke } = await import("@tauri-apps/api/core");
                  const { getKey } = useConnectorStore.getState();
                  const apiKey = getKey(c.keyField);
                  const headers: [string, string][] = [];
                  if (apiKey && c.authType !== "none") {
                    if (c.authType === "bearer") headers.push(["Authorization", `Bearer ${apiKey}`]);
                    else if (c.authType === "apikey_header" && c.authHeader) headers.push([c.authHeader, apiKey]);
                  }
                  const result = await invoke<string>("http_custom_call", {
                    url: c.url, method: c.method, headers, body: c.bodyTemplate || null,
                  });
                  setTestResult({ id: c.id, result: result.slice(0, 200), ok: true });
                } catch (e) {
                  setTestResult({ id: c.id, result: String(e), ok: false });
                } finally { setTesting(null); }
              }}
              onDelete={() => deleteCustomConnector(c.id)} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function CustomConnectorForm({ onSave, onCancel }: {
  onSave: (data: Omit<CustomHttpConnector, "id">) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<CustomHttpConnector["method"]>("POST");
  const [authType, setAuthType] = useState<CustomHttpConnector["authType"]>("bearer");
  const [authHeader, setAuthHeader] = useState("");
  const [keyField, setKeyField] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");

  return (
    <div className="bg-graphite border border-electric/30 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-xs font-semibold text-silk">Nouveau connecteur HTTP</p>

      <div className="grid grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Nom (ex: Mon API)" className="input-sm col-span-2" />
        <input value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Description" className="input-sm col-span-2" />
        <input value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="URL (https://api.example.com/endpoint)" className="input-sm col-span-2" />
        <select value={method} onChange={(e) => setMethod(e.target.value as CustomHttpConnector["method"])}
          className="input-sm">
          {["GET","POST","PUT","PATCH","DELETE"].map((m) => <option key={m}>{m}</option>)}
        </select>
        <select value={authType} onChange={(e) => setAuthType(e.target.value as CustomHttpConnector["authType"])}
          className="input-sm">
          <option value="bearer">Bearer Token</option>
          <option value="apikey_header">Header API Key</option>
          <option value="none">Aucune auth</option>
        </select>
        {authType === "apikey_header" && (
          <input value={authHeader} onChange={(e) => setAuthHeader(e.target.value)}
            placeholder="Nom du header (ex: X-API-Key)" className="input-sm col-span-2" />
        )}
        {authType !== "none" && (
          <input value={keyField} onChange={(e) => setKeyField(e.target.value)}
            placeholder="ID clé keyring (ex: mon_api)" className="input-sm col-span-2" />
        )}
        <textarea value={bodyTemplate} onChange={(e) => setBodyTemplate(e.target.value)}
          placeholder='Body JSON (optionnel) ex: {"query": "{{input}}"}' rows={3}
          className="input-sm col-span-2 resize-none" />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
        <Button variant="primary" size="sm" disabled={!name || !url}
          onClick={() => onSave({ name, description, url, method, authType, authHeader, keyField: keyField || "custom", bodyTemplate })}>
          Créer
        </Button>
      </div>
    </div>
  );
}

function CustomConnectorCard({ connector, testing, testResult, onTest, onDelete }: {
  connector: CustomHttpConnector;
  testing: boolean;
  testResult: { result: string; ok: boolean } | null;
  onTest: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-graphite border border-crystal/50 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-crystal/30 flex items-center justify-center shrink-0">
          <Server size={14} className="text-silk/50" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-silk">{connector.name}</span>
            <span className="text-[9px] bg-graphite-light text-silk/40 px-1.5 py-0.5 rounded-full font-mono">{connector.method}</span>
          </div>
          <p className="text-[10px] text-silk/40 truncate">{connector.url}</p>
          {connector.description && <p className="text-[10px] text-silk/30">{connector.description}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" loading={testing} onClick={onTest}>
            <Zap size={11} /> Tester
          </Button>
          <button onClick={onDelete}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/40 hover:text-red-400 hover:bg-red-400/10 transition-all">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {testResult && (
        <div className={cn("mt-2 rounded-lg px-3 py-2 text-[10px] font-mono",
          testResult.ok ? "bg-success/8 text-success/70" : "bg-danger/8 text-danger/70")}>
          {testResult.ok ? "✅" : "❌"} {testResult.result}
        </div>
      )}
    </div>
  );
}

// ── Skill Pack Card (depuis PackManager existant) ─────────────────────────────

function SkillPackCard({ pack, expanded, onToggle }: { pack: SkillPack; expanded: boolean; onToggle: () => void }) {
  const { skills, installSkillPack, uninstallSkillPack } = useAgentStore();
  const packSkillIds = pack.skills.map((s) => s.id);
  const installedCount = skills.filter((sk) => packSkillIds.includes(sk.id)).length;
  const isInstalled = installedCount === packSkillIds.length;
  const isPartial = installedCount > 0 && !isInstalled;

  return (
    <div className={cn("rounded-xl border transition-all duration-200",
      isInstalled ? "border-electric/30 bg-electric/5" : "border-crystal/50 bg-graphite")}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0",
          isInstalled ? "bg-electric/15" : "bg-crystal/50")}>
          {pack.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-silk">{pack.name}</span>
            {isInstalled && <span className="text-[10px] bg-electric/15 text-electric px-1.5 py-0.5 rounded-full">Installé</span>}
            {isPartial && <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full">Partiel</span>}
          </div>
          <p className="text-xs text-silk/40 truncate">{pack.description}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-silk/30">{pack.skills.length} skills</span>
          {isInstalled ? (
            <button onClick={() => uninstallSkillPack(pack.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all">
              <Trash2 size={13} />
            </button>
          ) : (
            <button onClick={() => installSkillPack(pack.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-electric/60 hover:text-electric hover:bg-electric/10 transition-all">
              <Download size={13} />
            </button>
          )}
          <button onClick={onToggle}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/30 hover:text-silk/60 transition-all">
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="border-t border-crystal/30 mx-4 mb-3 pt-3 flex flex-col gap-2">
              {pack.skills.map((skill) => {
                const inStore = skills.find((sk) => sk.id === skill.id);
                return (
                  <div key={skill.id} className="flex items-start gap-2.5 px-1">
                    <div className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      inStore ? "bg-electric/20 text-electric" : "bg-crystal/50 text-silk/20")}>
                      {inStore ? <Check size={9} strokeWidth={3} /> : <Plus size={9} strokeWidth={2.5} />}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-silk/80">{skill.name}</p>
                      <p className="text-[10px] text-silk/40">{skill.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
