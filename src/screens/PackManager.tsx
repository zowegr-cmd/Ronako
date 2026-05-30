import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Download, Trash2, Check, ChevronDown, ChevronRight,
  Plus, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SKILL_PACKS } from "@/lib/skillPacks";
import { useAgentStore } from "@/store/agentStore";
import { ALL_CONNECTORS, type Connector } from "@/lib/connectors/types";
import { useSettingsStore } from "@/store/settingsStore";
import type { SkillPack } from "@/types";

type Tab = "skills" | "connectors";

export function PackManager() {
  const [tab, setTab] = useState<Tab>("skills");
  const [expandedPack, setExpandedPack] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col bg-onyx overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-crystal/40 shrink-0">
        <div className="flex items-center gap-2.5">
          <Package size={18} className="text-electric" />
          <h1 className="text-base font-bold text-silk">Pack Manager</h1>
        </div>
        <div className="flex gap-1 bg-graphite rounded-xl p-0.5">
          {(["skills", "connectors"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all",
                tab === t ? "bg-crystal text-silk" : "text-silk/40 hover:text-silk/70"
              )}>
              {t === "skills" ? "Skills Packs" : "Connecteurs"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
        <AnimatePresence mode="wait">
          {tab === "skills" ? (
            <motion.div key="skills"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
              className="flex flex-col gap-3">
              <p className="text-xs text-silk/40 mb-1">
                Les packs enrichissent le prompt de tes agents avec des connaissances sectorielles.
              </p>
              {SKILL_PACKS.map((pack) => (
                <SkillPackCard key={pack.id} pack={pack}
                  expanded={expandedPack === pack.id}
                  onToggle={() => setExpandedPack(expandedPack === pack.id ? null : pack.id)} />
              ))}
            </motion.div>
          ) : (
            <motion.div key="connectors"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
              className="flex flex-col gap-3">
              <p className="text-xs text-silk/40 mb-1">
                Les connecteurs donnent à tes agents accès à des outils externes.
                Configure les clés API dans les Paramètres.
              </p>
              {ALL_CONNECTORS.map((c) => (
                <ConnectorCard key={c.id} connector={c} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Skill Pack Card ───────────────────────────────────────────────────────────

function SkillPackCard({ pack, expanded, onToggle }: { pack: SkillPack; expanded: boolean; onToggle: () => void }) {
  const { skills, installSkillPack, uninstallSkillPack } = useAgentStore();

  const packSkillIds = pack.skills.map((s) => s.id);
  const installedCount = skills.filter((sk) => packSkillIds.includes(sk.id)).length;
  const isInstalled = installedCount === packSkillIds.length;
  const isPartial = installedCount > 0 && !isInstalled;

  return (
    <div className={cn(
      "rounded-xl border transition-all duration-200",
      isInstalled ? "border-electric/30 bg-electric/5" : "border-crystal/50 bg-graphite",
    )}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0",
          isInstalled ? "bg-electric/15 text-electric" : "bg-crystal/50 text-silk/50",
        )}>
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
              className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all"
              title="Désinstaller">
              <Trash2 size={13} />
            </button>
          ) : (
            <button onClick={() => installSkillPack(pack.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-electric/60 hover:text-electric hover:bg-electric/10 transition-all"
              title="Installer">
              <Download size={13} />
            </button>
          )}

          <button onClick={onToggle}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/30 hover:text-silk/60 transition-all">
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>
      </div>

      {/* Expanded skills list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden">
            <div className="border-t border-crystal/30 mx-4 mb-3 pt-3 flex flex-col gap-2">
              {pack.skills.map((skill) => {
                const inStore = skills.find((sk) => sk.id === skill.id);
                return (
                  <div key={skill.id} className="flex items-start gap-2.5 px-1">
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      inStore ? "bg-electric/20 text-electric" : "bg-crystal/50 text-silk/20",
                    )}>
                      {inStore ? <Check size={9} strokeWidth={3} /> : <Plus size={9} strokeWidth={2.5} />}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-silk/80">{skill.name}</p>
                      <p className="text-[10px] text-silk/40">{skill.description}</p>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {skill.agentIds.map((aid) => (
                          <span key={aid} className="text-[9px] bg-crystal/50 text-silk/40 px-1.5 py-0.5 rounded-full">{aid}</span>
                        ))}
                      </div>
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

// ── Connector Card ────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  search: "Recherche",
  image: "Image",
  code: "Code",
  data: "Données",
  productivity: "Productivité",
};

function ConnectorCard({ connector }: { connector: Connector }) {
  const { getConnectorKey } = useSettingsStore();
  const hasKey = !!getConnectorKey(connector.apiKeyName);
  const isActive = hasKey;

  return (
    <div className={cn(
      "rounded-xl border px-4 py-3 flex items-center gap-3 transition-all",
      isActive ? "border-electric/30 bg-electric/5" : "border-crystal/50 bg-graphite",
    )}>
      <div className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0",
        isActive ? "bg-electric/15" : "bg-crystal/50",
      )}>
        {connector.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-silk">{connector.name}</span>
          <span className="text-[9px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded-full">
            {CATEGORY_LABELS[connector.category] ?? connector.category}
          </span>
          {isActive ? (
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Check size={8} strokeWidth={3} /> Actif
            </span>
          ) : (
            <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full">Clé manquante</span>
          )}
        </div>
        <p className="text-xs text-silk/40 truncate">{connector.description}</p>
      </div>

      <button
        onClick={() => document.dispatchEvent(new Event("open-settings-connectors"))}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/30 hover:text-silk/60 hover:bg-crystal transition-all"
        title="Configurer dans les Paramètres">
        <ExternalLink size={12} />
      </button>
    </div>
  );
}
