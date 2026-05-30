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
import { useToastStore } from "@/store/toastStore";
import { estimateTokens } from "@/lib/tokenCounter";
import { exportCustomPack } from "@/lib/exportImport";
import { buildPromptWithSkills, extractTemplateVars } from "@/lib/chainEngine";
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
              onEdit={(sk) => { setEditingSkill(sk); setSubTab("create"); }} />
          </motion.div>
        )}
        {subTab === "create" && (
          <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SkillEditorForm
              skill={editingSkill}
              onSave={(data) => {
                if (editingSkill) updateSkill(editingSkill.id, data);
                else addSkill({ ...data, createdBy: "user" });
                setEditingSkill(null); setSubTab("library");
              }}
              onCancel={() => { setEditingSkill(null); setSubTab("library"); }}
            />
          </motion.div>
        )}
      </AnimatePresence>
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
  const { customPacks, addCustomPack, updateCustomPack, deleteCustomPack, installCustomPack } = useAgentStore();

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
          {customPacks.map((pack) => (
            <CustomPackCard key={pack.id} pack={pack}
              expanded={expandedPack === pack.id}
              onToggle={() => setExpandedPack(expandedPack === pack.id ? null : pack.id)}
              onEdit={() => { setEditingPack(pack); setPackName(pack.name); setPackIcon(pack.icon); setPackDesc(pack.description); setShowPackForm(true); }}
              onDelete={() => deleteCustomPack(pack.id)}
              onInstall={() => installCustomPack(pack.id)}
              onUninstall={() => useAgentStore.getState().uninstallCustomPack(pack.id)} />
          ))}
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

// ── Custom Pack Card ─────────────────────────────────────────────────────────

function CustomPackCard({ pack, expanded, onToggle, onEdit, onDelete, onInstall, onUninstall }: {
  pack: SkillPack; expanded: boolean;
  onToggle: () => void; onEdit: () => void;
  onDelete: () => void; onInstall: () => void; onUninstall: () => void;
}) {
  const { skills, addSkillToPack, removeSkillFromPack } = useAgentStore();
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState("");

  const packSkillIds = pack.skills.map((s) => s.id);
  const installedCount = skills.filter((sk) => packSkillIds.includes(sk.id)).length;
  // Skills installés non encore dans ce pack
  const availableToAdd = skills.filter((sk) => !packSkillIds.includes(sk.id));

  return (
    <div className={cn("rounded-xl border transition-all",
      expanded ? "border-electric/30 bg-electric/3" : "border-crystal/50 bg-graphite")}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xl">{pack.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-silk">{pack.name}</p>
          <p className="text-[10px] text-silk/40">
            {pack.description || "Pack custom"} · {pack.skills.length} skill{pack.skills.length !== 1 ? "s" : ""}
          </p>
          {installedCount > 0 && <span className="text-[8px] bg-electric/15 text-electric px-1.5 py-0.5 rounded-full">Installé</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {installedCount > 0 ? (
            <button onClick={onUninstall} title="Désinstaller" className="w-7 h-7 rounded-lg flex items-center justify-center text-warning/50 hover:text-warning hover:bg-warning/10 transition-all">
              <Zap size={12} className="rotate-45" />
            </button>
          ) : (
            <button onClick={onInstall} title="Installer" className="w-7 h-7 rounded-lg flex items-center justify-center text-electric/50 hover:text-electric hover:bg-electric/10 transition-all">
              <Download size={13} />
            </button>
          )}
          <button onClick={() => void exportCustomPack(pack)} title="Exporter .ronako-pack"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/20 hover:text-silk/60 hover:bg-crystal transition-all">
            <ExternalLink size={11} />
          </button>
          <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/25 hover:text-silk/60 transition-all">
            <Pencil size={12} />
          </button>
          <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/40 hover:text-red-400 hover:bg-red-400/10 transition-all">
            <Trash2 size={12} />
          </button>
          <button onClick={onToggle} className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/30 hover:text-silk/60 transition-all">
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>
      </div>

      {/* Contenu expandé */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="border-t border-crystal/30 mx-4 mb-3 pt-3 flex flex-col gap-2">
              {/* Skills du pack */}
              {pack.skills.length === 0 ? (
                <p className="text-[11px] text-silk/30 text-center py-2">Ce pack est vide — ajoute des skills ci-dessous.</p>
              ) : pack.skills.map((skill) => (
                <div key={skill.id} className="flex items-center gap-2 px-2 py-1.5 bg-graphite-light rounded-lg border border-crystal/40">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-silk/80 truncate">{skill.name}</p>
                    <div className="flex gap-1 flex-wrap mt-0.5">
                      {skill.agentIds.slice(0, 4).map((aid) => (
                        <span key={aid} className="text-[8px] bg-crystal/40 text-silk/40 px-1 py-0.5 rounded">{aid}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => removeSkillFromPack(pack.id, skill.id)}
                    className="w-5 h-5 rounded flex items-center justify-center text-silk/20 hover:text-danger transition-all shrink-0" title="Retirer du pack">
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}

              {/* Ajouter un skill */}
              {availableToAdd.length > 0 && (
                <div className="flex gap-2 mt-1">
                  {showAddSkill ? (
                    <>
                      <select value={selectedSkillId} onChange={(e) => setSelectedSkillId(e.target.value)}
                        className="flex-1 bg-graphite border border-crystal/60 rounded-lg px-2 py-1 text-xs text-silk/60 focus:outline-none focus:border-electric/50">
                        <option value="">Choisir un skill…</option>
                        {availableToAdd.map((sk) => (
                          <option key={sk.id} value={sk.id}>{sk.name}</option>
                        ))}
                      </select>
                      <Button variant="primary" size="sm" disabled={!selectedSkillId}
                        onClick={() => {
                          const sk = skills.find((s) => s.id === selectedSkillId);
                          if (sk) addSkillToPack(pack.id, sk);
                          setSelectedSkillId(""); setShowAddSkill(false);
                        }}>
                        <Check size={11} /> Ajouter
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddSkill(false)}>✕</Button>
                    </>
                  ) : (
                    <button onClick={() => setShowAddSkill(true)}
                      className="flex items-center gap-1.5 text-[10px] text-electric/50 hover:text-electric transition-colors">
                      <Plus size={11} /> Ajouter un skill au pack
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sous-onglet Bibliothèque ──────────────────────────────────────────────────

const CONFLICTING_PAIRS = [
  ["formel", "casual"], ["formel", "décontracté"], ["court", "détaillé"],
  ["simple", "technique"], ["simple", "expert"], ["local", "international"],
  ["seo", "ux-writing"], ["émotionnel", "factuel"],
];

function LibrarySubTab({ onEdit }: { onEdit: (sk: import("@/types").Skill) => void }) {
  const [search, setSearch] = useState("");
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterActive, setFilterActive] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ name: string; description: string; content: string } | null>(null);
  const [pendingAgentIds, setPendingAgentIds] = useState<string[]>([]);
  const [previewSkillId, setPreviewSkillId] = useState<string | null>(null);
  const { skills, addSkill, deleteSkill, agents } = useAgentStore();
  const toast = useToastStore();

  const handleImportGithub = async () => {
    if (!githubUrl.trim()) return;
    setImporting(true);
    try {
      const raw = githubUrl
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/blob/", "/");
      const text = await invoke<string>("http_custom_call", {
        url: raw, method: "GET", headers: [], body: null,
      });
      const lines = text.split("\n");
      const name = lines.find((l) => l.startsWith("# "))?.slice(2).trim() ?? "Skill importé";
      const description = lines.find((l) => !l.startsWith("#") && l.trim())?.trim() ?? "";
      setPendingImport({ name, description, content: text });
      setGithubUrl("");
    } catch (e) { toast.error("Erreur import", String(e)); }
    finally { setImporting(false); }
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    addSkill({ ...pendingImport, agentIds: pendingAgentIds, isActive: true, isTemporary: false, inheritToAll: false, triggerKeywords: [], createdBy: "user" });
    toast.success("Skill importé", pendingImport.name);
    setPendingImport(null); setPendingAgentIds([]);
  };

  // Détection de conflits
  const conflicts: Array<{ agent: string; skillA: string; skillB: string }> = [];
  const nonSystemAgents = agents.filter((a) => !a.isSystem);
  for (const agent of nonSystemAgents) {
    const agentActive = skills.filter((sk) => sk.isActive && sk.agentIds.includes(agent.id));
    for (let i = 0; i < agentActive.length; i++) {
      for (let j = i + 1; j < agentActive.length; j++) {
        const textA = `${agentActive[i].name} ${agentActive[i].content}`.toLowerCase();
        const textB = `${agentActive[j].name} ${agentActive[j].content}`.toLowerCase();
        for (const [kw1, kw2] of CONFLICTING_PAIRS) {
          if ((textA.includes(kw1) && textB.includes(kw2)) || (textA.includes(kw2) && textB.includes(kw1))) {
            conflicts.push({ agent: agent.name, skillA: agentActive[i].name, skillB: agentActive[j].name });
          }
        }
      }
    }
  }

  // Budget tokens par agent
  const tokenBudget = nonSystemAgents.map((a) => {
    const active = skills.filter((sk) => sk.isActive && sk.agentIds.includes(a.id));
    const tokens = active.reduce((s, sk) => s + estimateTokens(sk.content), 0);
    return { name: a.name, count: active.length, tokens, pct: Math.min(100, Math.round(tokens / 38)) };
  }).filter((a) => a.count > 0);

  const filtered = skills.filter((sk) => {
    const matchSearch = !search || sk.name.toLowerCase().includes(search.toLowerCase());
    const matchAgent = filterAgent === "all" || sk.agentIds.includes(filterAgent);
    const matchActive = !filterActive || sk.isActive;
    return matchSearch && matchAgent && matchActive;
  });

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

      {/* Guided import — assigner agents avant de confirmer */}
      <AnimatePresence>
        {pendingImport && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-electric/5 border border-electric/30 rounded-xl p-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-electric">✅ "{pendingImport.name}" importé — assigne les agents :</p>
            <div className="flex flex-wrap gap-1.5">
              {nonSystemAgents.map((a) => (
                <button key={a.id} onClick={() => setPendingAgentIds((p) => p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id])}
                  className={cn("px-2 py-0.5 rounded-lg text-[10px] border transition-all",
                    pendingAgentIds.includes(a.id) ? "border-electric/40 bg-electric/10 text-electric" : "border-crystal text-silk/40 hover:text-silk/60")}>
                  {a.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setPendingImport(null); setPendingAgentIds([]); }}>Annuler</Button>
              <Button variant="primary" size="sm" onClick={confirmImport}>
                <Check size={11} /> Ajouter le skill
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conflits détectés */}
      {conflicts.length > 0 && (
        <div className="bg-warning/8 border border-warning/25 rounded-xl px-3 py-2">
          <p className="text-[10px] font-semibold text-warning/80 mb-1">⚠️ {conflicts.length} conflit{conflicts.length > 1 ? "s" : ""} détecté{conflicts.length > 1 ? "s" : ""}</p>
          {conflicts.slice(0, 3).map((c, i) => (
            <p key={i} className="text-[9px] text-silk/50">• {c.agent} : "{c.skillA}" ↔ "{c.skillB}"</p>
          ))}
        </div>
      )}

      {/* Budget tokens par agent */}
      {tokenBudget.length > 0 && (
        <div className="bg-graphite border border-crystal/30 rounded-xl px-3 py-2">
          <p className="text-[10px] text-silk/30 uppercase tracking-widest mb-1.5">Budget prompt par agent</p>
          {tokenBudget.map((a) => (
            <div key={a.name} className="flex items-center gap-2 mb-1">
              <span className="text-[9px] text-silk/50 w-16 truncate shrink-0">{a.name}</span>
              <div className="flex-1 h-1.5 bg-crystal rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", a.pct > 80 ? "bg-danger" : a.pct > 60 ? "bg-warning" : "bg-electric")}
                  style={{ width: `${a.pct}%` }} />
              </div>
              <span className={cn("text-[9px] w-16 text-right shrink-0", a.pct > 80 ? "text-danger/70" : "text-silk/30")}>
                {a.tokens} tok · {a.count} skill{a.count > 1 ? "s" : ""}
              </span>
            </div>
          ))}
          <p className="text-[8px] text-silk/20 mt-1">Plafond : 3800 tokens par agent</p>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-0">
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
        <button onClick={() => setFilterActive(!filterActive)}
          className={cn("px-2.5 py-1.5 rounded-lg text-[10px] border transition-all",
            filterActive ? "border-electric/40 bg-electric/10 text-electric" : "border-crystal text-silk/40 hover:text-silk/60")}>
          Actifs seulement
        </button>
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
                  {skill.useCount > 0 && (
                    <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full",
                      skill.avgScoreImpact >= 7 ? "bg-success/15 text-success/70" :
                      skill.avgScoreImpact >= 5 ? "bg-electric/10 text-electric/60" : "bg-warning/10 text-warning/60")}>
                      ⭐ {skill.avgScoreImpact.toFixed(1)} ({skill.useCount}×)
                    </span>
                  )}
                  <span className="text-[8px] text-silk/20">~{estimateTokens(skill.content)} tok</span>
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
                <button onClick={() => setPreviewSkillId(previewSkillId === skill.id ? null : skill.id)}
                  className="w-6 h-6 rounded flex items-center justify-center text-silk/25 hover:text-mystic/60" title="Prévisualiser le prompt">
                  <Eye size={11} />
                </button>
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

              {/* Panel preview prompt */}
              <AnimatePresence>
                {previewSkillId === skill.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <SkillPromptPreview skill={skill} agents={nonSystemAgents} skills={skills} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Prompt Preview ────────────────────────────────────────────────────────────

function SkillPromptPreview({ skill, agents, skills }: {
  skill: import("@/types").Skill;
  agents: import("@/types").Agent[];
  skills: import("@/types").Skill[];
}) {
  const [selectedAgentId, setSelectedAgentId] = useState(skill.agentIds[0] ?? "");
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const universalSkills = skills.filter((s) => s.isActive && s.inheritToAll);

  const preview = selectedAgent
    ? buildPromptWithSkills(selectedAgent, skills, universalSkills)
    : null;

  const tokens = preview ? Math.ceil(preview.length / 3.8) : 0;

  return (
    <div className="mx-3 mt-1 mb-2 bg-graphite-light border border-mystic/20 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-crystal/30">
        <span className="text-[10px] font-semibold text-mystic/70">👁 Prompt final de l'agent</span>
        <div className="flex items-center gap-2">
          <select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)}
            className="bg-graphite border border-crystal/50 rounded-lg px-2 py-0.5 text-[10px] text-silk/60 focus:outline-none">
            {skill.agentIds.length === 0 && <option value="">Aucun agent assigné</option>}
            {skill.agentIds.map((id) => {
              const a = agents.find((ag) => ag.id === id);
              return a ? <option key={id} value={id}>{a.name}</option> : null;
            })}
          </select>
          <span className={cn("text-[9px]", tokens > 3800 ? "text-danger/70" : tokens > 2800 ? "text-warning/70" : "text-silk/30")}>
            {tokens} / 3800 tok
          </span>
        </div>
      </div>
      {preview ? (
        <pre className="px-3 py-2 text-[9px] text-silk/50 font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
          {preview}
        </pre>
      ) : (
        <p className="px-3 py-3 text-[10px] text-silk/30 text-center">
          Assigne cet agent au skill pour voir le prompt.
        </p>
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
  const { agents, customPacks, addSkillToPack } = useAgentStore();
  const [name, setName] = useState(skill?.name ?? "");
  const [description, setDescription] = useState(skill?.description ?? "");
  const [content, setContent] = useState(skill?.content ?? "");
  const [agentIds, setAgentIds] = useState<string[]>(skill?.agentIds ?? []);
  const [inheritToAll, setInheritToAll] = useState(skill?.inheritToAll ?? false);
  const [keywords, setKeywords] = useState((skill?.triggerKeywords ?? []).join(", "));
  const [targetPackId, setTargetPackId] = useState("");

  const toggleAgent = (id: string) =>
    setAgentIds((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);

  const nonSystemAgents = agents.filter((a) => !a.isSystem);

  const handleSave = () => {
    const data = {
      name, description, content, agentIds, inheritToAll, isActive: true, isTemporary: false,
      triggerKeywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      sector: undefined as string | undefined,
    };
    onSave(data);
    // Si un pack est sélectionné, on ajoute aussi le skill au pack
    // Le skill sera créé par onSave, on l'ajoute après via un timer léger
    if (targetPackId) {
      setTimeout(() => {
        const { skills } = useAgentStore.getState();
        const created = skills.find((s) => s.name === name && s.content === content);
        if (created) addSkillToPack(targetPackId, created);
      }, 50);
    }
  };

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

      {/* Assigner aux agents */}
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

      {/* Ajouter à un pack */}
      {customPacks.length > 0 && (
        <div>
          <p className="text-[10px] text-silk/40 mb-1.5">Ajouter à un pack (optionnel) :</p>
          <select value={targetPackId} onChange={(e) => setTargetPackId(e.target.value)}
            className="w-full bg-graphite-light border border-crystal/60 rounded-lg px-2.5 py-1.5 text-xs text-silk/60 focus:outline-none focus:border-electric/50">
            <option value="">Aucun pack</option>
            {customPacks.map((p) => (
              <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
            ))}
          </select>
        </div>
      )}

      <label className="flex items-center gap-2 text-xs text-silk/60 cursor-pointer">
        <input type="checkbox" checked={inheritToAll} onChange={(e) => setInheritToAll(e.target.checked)}
          className="accent-electric" />
        🌐 Universel — injecté dans tous les agents de la chaîne
      </label>

      <div className="flex gap-2 justify-end pt-1 border-t border-crystal/30">
        <Button variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
        <Button variant="primary" size="sm" disabled={!name.trim() || !content.trim()}
          onClick={handleSave}>
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
  const { getKey, setKey, deleteKey } = useConnectorStore();

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
            onSave={(val) => void setKey(api.keyField, val)}
            onDelete={() => void deleteKey(api.keyField)} />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-silk/30 text-center py-8">Aucune API ne correspond à ta recherche.</p>
        )}
      </div>
    </motion.div>
  );
}

// Endpoints de test rapide par API
const TEST_ENDPOINTS: Record<string, { url: string; auth: "bearer" | "header"; headerName?: string }> = {
  openai:     { url: "https://api.openai.com/v1/models", auth: "bearer" },
  github:     { url: "https://api.github.com/user", auth: "bearer" },
  notion:     { url: "https://api.notion.com/v1/users/me", auth: "bearer" },
  stripe:     { url: "https://api.stripe.com/v1/account", auth: "bearer" },
  airtable:   { url: "https://api.airtable.com/v0/meta/whoami", auth: "bearer" },
  sendgrid:   { url: "https://api.sendgrid.com/v3/user/profile", auth: "bearer" },
  hubspot:    { url: "https://api.hubapi.com/crm/v3/objects/contacts?limit=1", auth: "bearer" },
  pipedrive:  { url: "https://api.pipedrive.com/v1/users/me", auth: "header", headerName: "x-api-token" },
  firecrawl:  { url: "https://api.firecrawl.dev/v1/scrape", auth: "bearer" },
  elevenlabs: { url: "https://api.elevenlabs.io/v1/user", auth: "header", headerName: "xi-api-key" },
};

function ApiCard({ api, currentKey, onSave, onDelete }: {
  api: ApiEntry; currentKey: string; onSave: (v: string) => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [keyInput, setKeyInput] = useState(currentKey);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const hasKey = !!currentKey;
  const catMeta = CATEGORY_META[api.category];
  const toast = useToastStore();

  const handleSave = async () => {
    setSaving(true);
    onSave(keyInput);
    setTestResult(null);
    setTimeout(() => setSaving(false), 600);
  };

  const handleTest = async () => {
    const key = keyInput || currentKey;
    if (!key) return;
    const endpoint = TEST_ENDPOINTS[api.id];
    if (!endpoint) {
      setTestResult({ ok: true, msg: "Clé enregistrée (test non disponible pour cette API)" });
      return;
    }
    setTesting(true); setTestResult(null);
    try {
      const headers: [string, string][] = endpoint.auth === "bearer"
        ? [["Authorization", `Bearer ${key}`]]
        : [[endpoint.headerName!, key]];
      await invoke<string>("http_custom_call", { url: endpoint.url, method: "GET", headers, body: null });
      setTestResult({ ok: true, msg: "✅ Clé valide — connexion réussie" });
      toast.success(`${api.name} connecté`, "Clé API validée");
    } catch (e) {
      const msg = String(e);
      const isInvalid = msg.includes("401") || msg.includes("403");
      setTestResult({ ok: false, msg: isInvalid ? "❌ Clé invalide ou permissions insuffisantes" : `⚠️ ${msg.slice(0, 80)}` });
    } finally { setTesting(false); }
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
                <Button variant="primary" size="sm" loading={saving} disabled={!keyInput.trim()} onClick={handleSave}>
                  <Check size={11} /> Sauver
                </Button>
                <Button variant="ghost" size="sm" loading={testing}
                  disabled={!keyInput.trim() && !hasKey} onClick={handleTest}>
                  <Zap size={11} /> Tester
                </Button>
                {hasKey && (
                  <button onClick={() => { onDelete(); setKeyInput(""); setTestResult(null); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Supprimer la clé">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              {testResult && (
                <p className={cn("text-[10px] mt-1", testResult.ok ? "text-success/70" : "text-danger/70")}>
                  {testResult.msg}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Onglet MCP ────────────────────────────────────────────────────────────────

function McpTab() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterOfficial, setFilterOfficial] = useState<"all" | "official" | "community">("all");
  const [githubUrl, setGithubUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const { customMcps, addCustomMcp, removeCustomMcp, mcpStates, setMcpState } = useConnectorStore();
  const toast = useToastStore();

  const startServer = async (entry: import("@/store/connectorStore").CustomMcpEntry) => {
    setMcpState(entry.id, { status: "starting", tools: [] });
    try {
      const extraArgs = entry.extraArgs ? entry.extraArgs.split(" ").filter(Boolean) : [];
      const tools = await invoke<import("@/store/connectorStore").McpTool[]>("mcp_start", {
        serverId: entry.id,
        package: entry.package.replace(/^npx -y /, ""),
        extraArgs,
      });
      setMcpState(entry.id, { status: "running", tools });
      toast.success(`${entry.name} démarré`, `${tools.length} outil${tools.length > 1 ? "s" : ""} disponible${tools.length > 1 ? "s" : ""}`);
    } catch (e) {
      setMcpState(entry.id, { status: "error", tools: [], errorMsg: String(e) });
      toast.error(`Erreur MCP ${entry.name}`, String(e));
    }
  };

  const stopServer = async (entry: import("@/store/connectorStore").CustomMcpEntry) => {
    try {
      await invoke("mcp_stop", { serverId: entry.id });
      setMcpState(entry.id, { status: "stopped", tools: [] });
      toast.success(`${entry.name} arrêté`, "");
    } catch (e) {
      toast.error("Erreur arrêt MCP", String(e));
    }
  };

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

      addCustomMcp({ name: repoClean, description, package: `npx -y ${pkgName}`, icon: "🔧" });
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

      {/* Serveurs MCP — actifs en premier */}
      {customMcps.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-silk/30 uppercase tracking-widest">
            Mes serveurs ({customMcps.length}) — Node.js requis
          </p>
          {customMcps.map((s) => {
            const state = mcpStates[s.id] ?? { status: "stopped", tools: [] };
            const isRunning = state.status === "running";
            const isStarting = state.status === "starting";
            return (
              <div key={s.id} className={cn("rounded-xl border transition-all",
                isRunning ? "border-success/30 bg-success/3" :
                state.status === "error" ? "border-danger/30 bg-danger/3" :
                "border-crystal/50 bg-graphite")}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-silk">{s.name}</p>
                      {isRunning && <span className="text-[9px] bg-success/15 text-success px-1.5 py-0.5 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Running · {state.tools.length} outils</span>}
                      {isStarting && <span className="text-[9px] bg-warning/15 text-warning px-1.5 py-0.5 rounded-full">⏳ Démarrage…</span>}
                      {state.status === "error" && <span className="text-[9px] bg-danger/15 text-danger px-1.5 py-0.5 rounded-full">❌ Erreur</span>}
                    </div>
                    <p className="text-[9px] text-silk/40">{s.description}</p>
                    {state.status === "error" && state.errorMsg && (
                      <p className="text-[9px] text-danger/60 mt-0.5">{state.errorMsg.slice(0, 100)}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {isRunning ? (
                      <Button variant="warning" size="sm" onClick={() => void stopServer(s)}>
                        ⏹ Arrêter
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" loading={isStarting} onClick={() => void startServer(s)}>
                        ▶ Démarrer
                      </Button>
                    )}
                    <button onClick={() => removeCustomMcp(s.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/40 hover:text-red-400 hover:bg-red-400/10">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {/* Outils disponibles */}
                <AnimatePresence>
                  {isRunning && state.tools.length > 0 && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="border-t border-crystal/20 mx-4 mb-3 pt-2 flex flex-wrap gap-1.5">
                        {state.tools.map((t) => (
                          <div key={t.name} className="flex items-center gap-1 bg-success/8 border border-success/20 rounded-lg px-2 py-0.5" title={t.description}>
                            <Zap size={8} className="text-success/50" />
                            <span className="text-[9px] text-success/70 font-mono">{t.name}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
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

  // Preview du schéma généré en temps réel
  const urlVars = extractTemplateVars(url);
  const bodyVars = extractTemplateVars(bodyTemplate);
  const allVars = [...new Set([...urlVars, ...bodyVars])];

  return (
    <div className="bg-graphite border border-electric/30 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-xs font-semibold text-silk">Nouveau connecteur HTTP</p>

      <div className="grid grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Nom (ex: Mon API Stripe)" className="input-sm col-span-2" />
        <input value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (ce que l'agent peut faire avec)" className="input-sm col-span-2" />
        <input value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/{{endpoint}}" className="input-sm col-span-2" />
        <select value={method} onChange={(e) => setMethod(e.target.value as CustomHttpConnector["method"])} className="input-sm">
          {["GET","POST","PUT","PATCH","DELETE"].map((m) => <option key={m}>{m}</option>)}
        </select>
        <select value={authType} onChange={(e) => setAuthType(e.target.value as CustomHttpConnector["authType"])} className="input-sm">
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
            placeholder="ID clé keyring (ex: stripe) — configurer dans onglet APIs" className="input-sm col-span-2" />
        )}
        <div className="col-span-2 flex flex-col gap-1">
          <textarea value={bodyTemplate} onChange={(e) => setBodyTemplate(e.target.value)}
            placeholder={'Body JSON avec variables {{nom}}\nex: {"to": "{{email}}", "subject": "{{subject}}", "body": "{{content}}"}'}
            rows={3} className="input-sm resize-none" />
          <p className="text-[9px] text-silk/30">💡 Utilise {"{{variable}}"} pour que Claude remplisse les valeurs dynamiquement.</p>
        </div>
      </div>

      {/* Preview du tool definition généré */}
      {name && url && (
        <div className="bg-graphite-light border border-crystal/40 rounded-xl p-3">
          <p className="text-[9px] text-silk/30 mb-1.5 uppercase tracking-widest">Schéma que Claude va recevoir</p>
          <pre className="text-[9px] text-electric/60 font-mono leading-relaxed whitespace-pre-wrap">
{`{
  "name": "custom_[id]",
  "description": "${description || name}",
  "input": {
${allVars.length > 0
  ? allVars.map((v) => `    "${v}": string`).join(",\n")
  : '    "input": string  ← aucune variable détectée'}
  }
}`}
          </pre>
          {allVars.length > 0 && (
            <p className="text-[9px] text-success/60 mt-1">
              ✅ {allVars.length} variable{allVars.length > 1 ? "s" : ""} détectée{allVars.length > 1 ? "s" : ""} : {allVars.join(", ")}
            </p>
          )}
        </div>
      )}

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
  const allVars = [...new Set([
    ...extractTemplateVars(connector.url),
    ...extractTemplateVars(connector.bodyTemplate ?? ""),
  ])];

  return (
    <div className="bg-graphite border border-crystal/50 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-crystal/30 flex items-center justify-center shrink-0">
          <Server size={14} className="text-silk/50" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-silk">{connector.name}</span>
            <span className="text-[9px] bg-graphite-light text-silk/40 px-1.5 py-0.5 rounded-full font-mono">{connector.method}</span>
            {allVars.length > 0 ? (
              <span className="text-[9px] bg-success/10 text-success/60 px-1.5 py-0.5 rounded-full">
                ⚡ {allVars.length} var{allVars.length > 1 ? "s" : ""}: {allVars.join(", ")}
              </span>
            ) : (
              <span className="text-[9px] bg-warning/10 text-warning/50 px-1.5 py-0.5 rounded-full">
                ⚠️ Aucune variable — Claude ne saura pas quoi envoyer
              </span>
            )}
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
