import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy } from "lucide-react";
import { loadDeliverable } from "@/lib/libraryManager";
import { formatCost } from "@/lib/utils";
import { CHAIN_MODES } from "@/lib/chainModes";
import type { DeliverableEntry, DeliverableData } from "@/types";

interface VersionComparatorProps {
  entries: DeliverableEntry[];
  open: boolean;
  onClose: () => void;
}

// ─── Diff ligne par ligne ─────────────────────────────────────────────────────
type DiffLine = { type: "same" | "added" | "removed"; text: string };

function diffLines(a: string, b: string): { left: DiffLine[]; right: DiffLine[] } {
  const linesA = a.split("\n");
  const linesB = b.split("\n");
  const left: DiffLine[] = [];
  const right: DiffLine[] = [];

  const maxLen = Math.max(linesA.length, linesB.length);
  for (let i = 0; i < maxLen; i++) {
    const la = linesA[i] ?? "";
    const lb = linesB[i] ?? "";
    if (la === lb) {
      left.push({ type: "same", text: la });
      right.push({ type: "same", text: lb });
    } else {
      left.push({ type: la ? "removed" : "same", text: la });
      right.push({ type: lb ? "added" : "same", text: lb });
    }
  }
  return { left, right };
}

export function VersionComparator({ entries, open, onClose }: VersionComparatorProps) {
  const [idA, setIdA] = useState<string>(entries[0]?.id ?? "");
  const [idB, setIdB] = useState<string>(entries[1]?.id ?? "");
  const [dataA, setDataA] = useState<DeliverableData | null>(null);
  const [dataB, setDataB] = useState<DeliverableData | null>(null);

  const entryA = entries.find((e) => e.id === idA);
  const entryB = entries.find((e) => e.id === idB);

  useEffect(() => {
    if (!open) return;
    if (idA) loadDeliverable(entries.find((e) => e.id === idA)!).then(setDataA).catch(() => setDataA(null));
  }, [idA, open]);

  useEffect(() => {
    if (!open) return;
    if (idB) loadDeliverable(entries.find((e) => e.id === idB)!).then(setDataB).catch(() => setDataB(null));
  }, [idB, open]);

  const textA = dataA?.finalDeliverable ?? "";
  const textB = dataB?.finalDeliverable ?? "";
  const { left, right } = diffLines(textA, textB);

  const modeA = entryA ? (CHAIN_MODES[entryA.mode] ?? CHAIN_MODES.project) : null;
  const modeB = entryB ? (CHAIN_MODES[entryB.mode] ?? CHAIN_MODES.project) : null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="vc-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div key="vc-modal" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="fixed inset-4 z-50 flex flex-col bg-graphite border border-crystal rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center gap-4 px-5 py-3 border-b border-crystal shrink-0">
              <p className="text-sm font-bold text-silk flex-1">📊 Comparateur de versions</p>
              <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/30 hover:text-silk hover:bg-crystal">
                <X size={14} />
              </button>
            </div>

            {/* Sélecteurs */}
            <div className="grid grid-cols-2 gap-4 px-5 py-3 border-b border-crystal/50 shrink-0">
              {([ ["A", idA, setIdA, entryA, modeA], ["B", idB, setIdB, entryB, modeB] ] as Array<[string, string, (v:string)=>void, DeliverableEntry|undefined, typeof modeA]>).map(
                ([label, selectedId, setId, entry, mode]) => (
                  <div key={label}>
                    <p className="text-[10px] text-silk/40 uppercase tracking-widest mb-1">Version {label}</p>
                    <select value={selectedId} onChange={(e) => setId(e.target.value)}
                      className="w-full bg-graphite-light border border-crystal rounded-lg px-2.5 py-1.5 text-xs text-silk focus:outline-none focus:border-electric/40">
                      {entries.map((e) => (
                        <option key={e.id} value={e.id}>
                          {new Date(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {e.score > 0 ? `⭐${e.score}/10` : "–"} · {formatCost(e.realCost)}
                        </option>
                      ))}
                    </select>
                    {entry && mode && (
                      <div className="flex gap-2 mt-1 text-[10px] text-silk/35">
                        <span>{mode.icon} {mode.label}</span>
                        <span>·</span>
                        <span>{entry.agents.length} agents</span>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Diff stats */}
            {entryA && entryB && (
              <div className="flex gap-6 px-5 py-2 border-b border-crystal/30 text-xs shrink-0">
                <span>Score : {entryA.score > 0 ? `${entryA.score}/10` : "–"} → {entryB.score > 0 ? `${entryB.score}/10` : "–"}
                  {entryA.score > 0 && entryB.score > 0 && (
                    <span className={entryB.score > entryA.score ? "text-success ml-1" : entryB.score < entryA.score ? "text-danger ml-1" : "text-silk/30 ml-1"}>
                      ({entryB.score > entryA.score ? "+" : ""}{entryB.score - entryA.score})
                    </span>
                  )}
                </span>
                <span>Coût : {formatCost(entryA.realCost)} → {formatCost(entryB.realCost)}</span>
                <span>Agents : {entryA.agents.length} → {entryB.agents.length}</span>
              </div>
            )}

            {/* Diff côte à côte */}
            <div className="flex-1 overflow-hidden grid grid-cols-2 gap-0 min-h-0">
              {[{ lines: left, label: "Version A", data: dataA }, { lines: right, label: "Version B", data: dataB }].map(
                ({ lines, label, data }, col) => (
                  <div key={col} className={`flex flex-col overflow-hidden ${col === 0 ? "border-r border-crystal/30" : ""}`}>
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-crystal/30 shrink-0">
                      <span className="text-[10px] text-silk/40">{label}</span>
                      {data?.finalDeliverable && (
                        <button onClick={() => navigator.clipboard.writeText(data.finalDeliverable)}
                          className="text-silk/25 hover:text-silk/60 transition-colors">
                          <Copy size={11} />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px] leading-5">
                      {lines.map((line, i) => (
                        <div key={i} className={
                          line.type === "added" ? "bg-success/10 text-success/80" :
                          line.type === "removed" ? "bg-danger/10 text-danger/60 line-through" :
                          "text-silk/50"
                        }>
                          {line.text || " "}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
