import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { BookMarked, Search, Eye, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { useProjectStore } from "@/store/projectStore";
import { useAgentStore } from "@/store/agentStore";
import { useToastStore } from "@/store/toastStore";
import { loadLibrary, deleteDeliverable } from "@/lib/libraryManager";
import type { DeliverableEntry } from "@/types";
import { CHAIN_MODES } from "@/lib/chainModes";
import { cn, relativeTime, formatCost } from "@/lib/utils";

interface LibraryPanelProps {
  onOpen: (entry: DeliverableEntry) => void;
  onRework: (entry: DeliverableEntry) => void;
}

export function LibraryPanel({ onOpen, onRework }: LibraryPanelProps) {
  const { getActiveProject } = useProjectStore();
  const { getAgent } = useAgentStore();
  const toast = useToastStore();
  const [entries, setEntries] = useState<DeliverableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const project = getActiveProject();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadLibrary(project?.path ?? null);
      setEntries(data);
    } catch { setEntries([]); }
    finally { setLoading(false); }
  }, [project?.path]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (entry: DeliverableEntry) => {
    if (deleteConfirm !== entry.id) { setDeleteConfirm(entry.id); return; }
    try {
      await deleteDeliverable(entry.path);
      setEntries((e) => e.filter((x) => x.id !== entry.id));
      toast.success("Supprimé", "Livrable supprimé de la bibliothèque");
    } catch (e) { toast.error("Erreur", String(e)); }
    setDeleteConfirm(null);
  };

  const filtered = entries.filter((e) =>
    !search || e.brief.toLowerCase().includes(search.toLowerCase()),
  );

  const totalCost = entries.reduce((s, e) => s + e.realCost, 0);
  const avgScore = entries.length > 0 ? entries.reduce((s, e) => s + e.score, 0) / entries.length : 0;

  const scoreColor = (s: number) => s >= 8 ? "#10B981" : s >= 6 ? "#F59E0B" : "#EF4444";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-silk/30">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-xs">Chargement…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header stats ─────────────────────────────────────────── */}
      <div className="px-3 py-2.5 border-b border-crystal/50 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <BookMarked size={13} className="text-silk/40" />
            <p className="text-xs font-semibold text-silk/70">Bibliothèque</p>
          </div>
          <button onClick={refresh} className="w-6 h-6 rounded-md flex items-center justify-center text-silk/25 hover:text-silk/60 transition-all">
            <RefreshCw size={11} />
          </button>
        </div>
        {entries.length > 0 && (
          <div className="flex gap-3 text-[10px] text-silk/35">
            <span>{entries.length} livrable{entries.length > 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{formatCost(totalCost)} total</span>
            <span>·</span>
            <span>⭐ {avgScore.toFixed(1)}/10 moy.</span>
          </div>
        )}
      </div>

      {/* ── Recherche ────────────────────────────────────────────── */}
      <div className="px-3 py-2 border-b border-crystal/30 shrink-0">
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-silk/25 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full bg-graphite-light border border-crystal rounded-lg pl-7 pr-3 py-1.5 text-xs text-silk placeholder-silk/25 focus:outline-none focus:border-electric/40 transition-colors"
          />
        </div>
      </div>

      {/* ── Liste ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 min-h-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4 py-8">
            <BookMarked size={20} className="text-silk/15" />
            <p className="text-xs text-silk/30">
              {search ? `Aucun livrable pour "${search}"` : "Aucun livrable sauvegardé"}
            </p>
            <p className="text-[10px] text-silk/20">Les livrables sont sauvegardés automatiquement après chaque chaîne.</p>
          </div>
        ) : (
          filtered.map((entry) => {
            const modeConfig = CHAIN_MODES[entry.mode] ?? CHAIN_MODES.project;
            const sc = entry.score;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-graphite-light border border-crystal rounded-xl overflow-hidden hover:border-crystal-light transition-all"
              >
                {/* Header livrable */}
                <div className="px-3 py-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[11px] font-medium text-silk leading-relaxed line-clamp-2 flex-1">
                      {entry.brief.slice(0, 80)}{entry.brief.length > 80 ? "…" : ""}
                    </p>
                    {sc > 0 && (
                      <span className="text-[11px] font-bold shrink-0" style={{ color: scoreColor(sc) }}>⭐{sc}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-silk/35">{modeConfig.icon} {modeConfig.label}</span>
                    <span className="text-[10px] text-silk/25">·</span>
                    <span className="text-[10px] text-silk/35">{formatCost(entry.realCost)}</span>
                    <span className="text-[10px] text-silk/25">·</span>
                    <span className="text-[10px] text-silk/35">
                      {entry.duration >= 60 ? `${Math.round(entry.duration / 60)}min` : `${entry.duration}s`}
                    </span>
                    <span className="text-[10px] text-silk/25">·</span>
                    <span className="text-[10px] text-silk/30">{relativeTime(entry.date)}</span>
                  </div>

                  {/* Agents miniature */}
                  <div className="flex items-center gap-1 mt-1.5">
                    {entry.agents.slice(0, 5).map((id) => {
                      const a = getAgent(id);
                      if (!a) return null;
                      return <AgentAvatar key={id} colors={a.colors as [string,string]} name={a.name} size={16} />;
                    })}
                    {entry.agents.length > 5 && (
                      <span className="text-[9px] text-silk/25">+{entry.agents.length - 5}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex border-t border-crystal/30">
                  <button onClick={() => onOpen(entry)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-silk/40 hover:text-electric hover:bg-electric/5 transition-all">
                    <Eye size={10} /> Ouvrir
                  </button>
                  <button onClick={() => onRework(entry)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-silk/40 hover:text-mystic hover:bg-mystic/5 transition-all border-x border-crystal/30">
                    <RefreshCw size={10} /> Retravailler
                  </button>
                  <button
                    onClick={() => handleDelete(entry)}
                    onBlur={() => setTimeout(() => setDeleteConfirm(null), 200)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-all",
                      deleteConfirm === entry.id
                        ? "text-danger bg-danger/15 border-t border-danger/20"
                        : "text-silk/35 hover:text-danger hover:bg-danger/5",
                    )}
                  >
                    <Trash2 size={10} />
                    {deleteConfirm === entry.id ? "Confirmer ?" : "Supprimer"}
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
