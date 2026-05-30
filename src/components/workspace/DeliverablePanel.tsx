import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, FileText, Code2, Check, Download, ChevronDown, ChevronUp, RefreshCw, Terminal, Image, FolderOpen, Sparkles } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { formatForClaudeCode, extractClaudeCodeBlock } from "@/lib/claudeCodeFormatter";
import { generateClientReport } from "@/lib/clientReportGenerator";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useChainStore } from "@/store/chainStore";
import { useAgentStore } from "@/store/agentStore";
import { useProjectStore } from "@/store/projectStore";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { MarkdownMessage } from "@/components/ui/MarkdownMessage";
import { formatCost, formatTokens } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useVisualStore } from "@/store/visualStore";

type PanelView = "outputs" | "stats" | "presentation" | "visuals" | "files";

interface GeneratedVisual {
  id: string;
  local_path: string;
  url?: string;
  model: string;
  prompt: string;
  cost_cents: number;
  agentId?: string;
}

interface GeneratedFile {
  id: string;
  name: string;
  local_path: string;
  size_bytes: number;
  agentId?: string;
}

export function DeliverablePanel() {
  const { run, ryoResult, realCost, relaySavedTokens, relayCallCount } = useChainStore();
  const { getAgent } = useAgentStore();
  const { getActiveProject } = useProjectStore();
  const toast = useToastStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<PanelView>("outputs");
  const [presentationIndex, setPresentationIndex] = useState(0);
  const [visuals, setVisuals] = useState<GeneratedVisual[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);

  // Détecter l'output Forge (# RONAKO_FORGE) dans les messages
  useEffect(() => {
    const forgeMsg = run.messages.find(
      (m) => m.agentId === "forge" && m.content.includes("# RONAKO_FORGE"),
    );
    if (forgeMsg) setView("files");
  }, [run.messages]);

  // Écouter les résultats d'outils depuis useChainRunner
  useEffect(() => {
    const handler = (e: Event) => {
      const { tool_name, metadata } = (e as CustomEvent).detail as {
        tool_name: string;
        is_error: boolean;
        metadata?: Record<string, unknown>;
      };
      if (!metadata) return;
      if (tool_name === "generate_image_dalle" || tool_name === "generate_image_flux") {
        const local_path = String(metadata.local_path ?? "");
        if (local_path) {
          setVisuals((prev) => [...prev, {
            id: String(Date.now()),
            local_path,
            url: String(metadata.url ?? ""),
            model: String(metadata.model ?? tool_name),
            prompt: String(metadata.prompt ?? ""),
            cost_cents: Number(metadata.cost_cents ?? 0),
          }]);
        }
      }
      if (tool_name === "execute_code") {
        const files = (metadata.files as Array<{ name: string; local_path: string; size_bytes: number }>) ?? [];
        for (const f of files) {
          setGeneratedFiles((prev) => [...prev, {
            id: String(Date.now()) + f.name,
            name: f.name,
            local_path: f.local_path,
            size_bytes: f.size_bytes,
          }]);
        }
      }
    };
    document.addEventListener("tool-result", handler);
    return () => document.removeEventListener("tool-result", handler);
  }, []);

  const downloadFile = useCallback(async (filePath: string, name: string) => {
    try {
      const dest = await saveDialog({ defaultPath: name });
      if (dest) {
        const response = await fetch(convertFileSrc(filePath));
        const buffer = await response.arrayBuffer();
        await writeFile(dest, new Uint8Array(buffer));
        toast.success("Téléchargé", name);
      }
    } catch (e) { toast.error("Erreur téléchargement", String(e)); }
  }, [toast]);

  const project = getActiveProject();
  const completedMessages = run.messages.filter((m) => m.role === "assistant");
  const isCompleted = run.status === "completed";
  const hasMessages = completedMessages.length > 0;

  const toggleExpand = (id: string) =>
    setExpandedIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const buildMarkdown = () => {
    const lines: string[] = [`# Livrables — ${project?.name ?? "Projet"}`, `> ${new Date().toLocaleDateString("fr-FR", { dateStyle: "long" })}`, ""];
    completedMessages.forEach((msg) => {
      const agent = msg.agentId ? getAgent(msg.agentId) : null;
      if (agent) lines.push(`## ${agent.name} — ${agent.role}`, "");
      lines.push(msg.content, "", "---", "");
    });
    return lines.join("\n");
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAllMarkdown = () => { navigator.clipboard.writeText(buildMarkdown()); toast.success("Copié", "Livrables copiés en Markdown"); };

  const copyClientReport = () => {
    const samMsg = completedMessages.find((m) => m.agentId === "sam");
    const ellaMsg = completedMessages.find((m) => m.agentId === "ella");
    const ryoMsg = completedMessages.find((m) => m.agentId === "ryo");
    const outputs: Record<string, string> = {};
    if (ellaMsg) outputs.ella = ellaMsg.content;
    if (ryoMsg) outputs.ryo = ryoMsg.content;
    if (samMsg) outputs.sam = samMsg.content;

    const report = generateClientReport(
      { id: "", path: "", date: new Date().toISOString(), brief: "", mode: "project", agents: [], score: useChainStore.getState().ryoResult?.score ?? 0, realCost: 0, duration: 0, dna: "", outputs, finalDeliverable: ellaMsg?.content ?? "", ryoWeaknesses: [] },
      { clientName: "Client", projectName: project?.name ?? "Projet", yourName: "Ronako", includeScore: true, language: "fr" }
    );
    navigator.clipboard.writeText(report);
    toast.success("📄 Rapport client copié", "Prêt à partager");
  };

  const copyForClaudeCode = () => {
    const samMsg = completedMessages.find((m) => m.agentId === "sam");
    const rawDeliverable = samMsg?.content ?? completedMessages.at(-1)?.content ?? buildMarkdown();
    const ccBlock = extractClaudeCodeBlock(rawDeliverable);
    const formatted = formatForClaudeCode(ccBlock, {
      name: project?.name ?? "Projet",
      path: project?.path && project.path !== "/" ? project.path : undefined,
      dna: useChainStore.getState().projectDNA ?? undefined,
    });
    navigator.clipboard.writeText(formatted);
    toast.success("✓ Copié pour Claude Code", "Colle dans le terminal Claude Code");
  };

  const downloadMarkdown = async () => {
    setExporting(true);
    try {
      const name = `${(project?.name ?? "ronako").replace(/\s+/g, "-").toLowerCase()}-livrables.md`;
      const p = await save({ defaultPath: name, filters: [{ name: "Markdown", extensions: ["md"] }] });
      if (p) { await writeTextFile(p, buildMarkdown()); toast.success("Exporté", p.split(/[\\/]/).pop() ?? p); }
    } catch (e) { toast.error("Erreur export", String(e)); } finally { setExporting(false); }
  };

  const downloadHtml = async () => {
    setExporting(true);
    try {
      const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Livrables — ${project?.name}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#1a1a1a;line-height:1.6}h1{border-bottom:2px solid #007AFF;padding-bottom:8px}h2{color:#007AFF;margin-top:32px}hr{border:1px solid #eee}</style></head><body>
<h1>Livrables — ${project?.name ?? "Projet"}</h1>
${completedMessages.map((m) => { const a = m.agentId ? getAgent(m.agentId) : null; return `${a ? `<h2>${a.name} — ${a.role}</h2>` : ""}<p>${m.content.replace(/\n/g, "<br>")}</p><hr>`; }).join("\n")}</body></html>`;
      const p = await save({ defaultPath: `${(project?.name ?? "ronako").replace(/\s+/g, "-").toLowerCase()}-livrables.html`, filters: [{ name: "HTML", extensions: ["html"] }] });
      if (p) { await writeTextFile(p, html); toast.success("Exporté HTML", p.split(/[\\/]/).pop() ?? p); }
    } catch (e) { toast.error("Erreur export", String(e)); } finally { setExporting(false); }
  };

  if (!hasMessages) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <div className="w-10 h-10 rounded-2xl bg-graphite-light border border-crystal flex items-center justify-center">
          <FileText size={16} className="text-silk/25" />
        </div>
        <p className="text-sm font-medium text-silk/40">Pas encore de livrables</p>
        <p className="text-xs text-silk/20">Les outputs apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Résumé tokens + coût ──────────────────────────────────── */}
      <div className="px-3 py-2 border-b border-crystal/50 flex items-center justify-between shrink-0">
        <div className="flex gap-2 items-center">
          <span className="text-[11px] text-silk/40">{formatTokens(run.totalTokens)} tok</span>
          <span className="text-[10px] text-silk/20">·</span>
          <span className="text-[11px] text-silk/40">{formatCost(realCost || run.totalCost)}</span>
          {relaySavedTokens > 0 && (
            <span className="text-[10px] text-mystic/50">⟡ −{formatCost(relaySavedTokens * 0.00015)}</span>
          )}
        </div>
        {isCompleted ? <Badge variant="success" dot>Terminé</Badge> : hasMessages && <Badge variant="ghost">En cours</Badge>}
      </div>

      {/* ── Score Ryo ─────────────────────────────────────────────── */}
      {ryoResult && ryoResult.score > 0 && (
        <div data-tour="score-ryo" className="px-3 py-3 border-b border-crystal/30 shrink-0" style={{ backgroundColor: ryoResult.scoreBg }}>
          {/* Score header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">⭐</span>
              <span className="text-xs font-semibold text-silk">Score Ryo</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="ghost" style={{ color: ryoResult.scoreColor, borderColor: `${ryoResult.scoreColor}40`, backgroundColor: `${ryoResult.scoreColor}15` } as React.CSSProperties}>
                {ryoResult.scoreLabel}
              </Badge>
              <span className="text-sm font-bold" style={{ color: ryoResult.scoreColor }}>{ryoResult.score}/10</span>
            </div>
          </div>

          {/* Barre de progression animée */}
          <div className="h-1.5 bg-crystal rounded-full overflow-hidden mb-2.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ryoResult.score * 10}%` }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="h-full rounded-full"
              style={{ backgroundColor: ryoResult.scoreColor }}
            />
          </div>

          {/* Points forts */}
          {ryoResult.points.length > 0 && (
            <div className="mb-1.5">
              <p className="text-[10px] text-success/60 font-medium mb-0.5">✅ Points forts</p>
              {ryoResult.points.map((p, i) => (
                <p key={i} className="text-[10px] text-silk/55 leading-relaxed">• {p}</p>
              ))}
            </div>
          )}

          {/* Points faibles */}
          {ryoResult.weaknesses.length > 0 && (
            <div className="mb-1.5">
              <p className="text-[10px] text-warning/60 font-medium mb-0.5">⚠️ Points faibles</p>
              {ryoResult.weaknesses.map((w, i) => (
                <p key={i} className="text-[10px] text-silk/55 leading-relaxed">• {w}</p>
              ))}
            </div>
          )}

          {/* Recommandation */}
          {ryoResult.recommendation && (
            <p className="text-[10px] text-silk/50 italic mt-1 leading-relaxed">💡 "{ryoResult.recommendation}"</p>
          )}

          {/* Bouton corriger si score < 8 */}
          {ryoResult.score < 8 && (
            <button
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-warning/30 bg-warning/8 text-[11px] text-warning/70 hover:bg-warning/15 transition-all"
              onClick={() => {}}
            >
              <RefreshCw size={11} /> Corriger les points faibles
            </button>
          )}
        </div>
      )}

      {/* ── Tabs views ───────────────────────────────────────────── */}
      <div className="flex gap-0.5 px-3 pt-2 shrink-0 flex-wrap">
        {(["outputs", "stats", "presentation"] as PanelView[]).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
              view === v ? "bg-electric/15 text-electric" : "text-silk/30 hover:text-silk/60 hover:bg-crystal/50"
            }`}>
            {v === "outputs" ? "📄 Outputs" : v === "stats" ? "📊 Stats" : "🎯 Présentation"}
          </button>
        ))}
        {visuals.length > 0 && (
          <button onClick={() => setView("visuals")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 ${
              view === "visuals" ? "bg-electric/15 text-electric" : "text-silk/30 hover:text-silk/60 hover:bg-crystal/50"
            }`}>
            <Image size={10} /> Visuels ({visuals.length})
          </button>
        )}
        {generatedFiles.length > 0 && (
          <button onClick={() => setView("files")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 ${
              view === "files" ? "bg-electric/15 text-electric" : "text-silk/30 hover:text-silk/60 hover:bg-crystal/50"
            }`}>
            <FolderOpen size={10} /> Fichiers ({generatedFiles.length})
          </button>
        )}
      </div>

      {/* ── Messages scrollables ──────────────────────────────────── */}
      {view === "outputs" && (
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0">
        {completedMessages.map((msg) => {
          const agent = msg.agentId ? getAgent(msg.agentId) : null;
          const isExpanded = expandedIds.has(msg.id);
          return (
            <div key={msg.id} className="bg-graphite-light border border-crystal rounded-xl overflow-hidden">
              {agent && (
                <div className="flex items-center justify-between px-3 py-2 border-b border-crystal/50">
                  <div className="flex items-center gap-2">
                    <AgentAvatar colors={agent.colors as [string,string]} name={agent.name} size={20} />
                    <span className="text-xs font-medium text-silk/70">{agent.name}</span>
                    <span className="text-[10px] text-silk/30">{agent.role}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => toggleExpand(msg.id)} className="w-6 h-6 rounded-md flex items-center justify-center text-silk/30 hover:text-silk hover:bg-crystal transition-all">
                      {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                    <button onClick={() => copyMessage(msg.id, msg.content)} className="w-6 h-6 rounded-md flex items-center justify-center text-silk/30 hover:text-silk hover:bg-crystal transition-all">
                      {copiedId === msg.id ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
              )}
              <div className={`px-3 py-2 ${isExpanded ? "" : "max-h-36 overflow-hidden"}`}>
                <MarkdownMessage content={msg.content} compact />
              </div>
              {!isExpanded && msg.content.length > 300 && (
                <button onClick={() => toggleExpand(msg.id)}
                  className="w-full py-1 text-[10px] text-electric/50 hover:text-electric transition-colors border-t border-crystal/30 bg-graphite/50">
                  Voir tout ↓
                </button>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* ── Stats visuels ────────────────────────────────────────── */}
      {view === "stats" && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0">
          {/* Score global */}
          <div className="bg-graphite-light border border-crystal rounded-xl p-3">
            <p className="text-[10px] text-silk/30 uppercase tracking-wider mb-2">Score final</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold" style={{ color: ryoResult?.scoreColor ?? "#6B7280" }}>
                {ryoResult?.score ?? "—"}
              </span>
              <span className="text-sm text-silk/30 mb-1">/10</span>
              {ryoResult?.scoreLabel && <span className="text-xs text-silk/50 mb-1">{ryoResult.scoreLabel}</span>}
            </div>
          </div>

          {/* Grille stats */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Agents" value={String(completedMessages.length)} icon="🤖" />
            <StatCard label="Coût réel" value={formatCost(realCost || run.totalCost)} icon="💰" />
            <StatCard label="Tokens" value={formatTokens(run.totalTokens)} icon="📝" />
            <StatCard label="Relay ×" value={String(relayCallCount)} icon="⟡" color="mystic" />
          </div>

          {/* Économies Relay */}
          {relaySavedTokens > 0 && (
            <div className="bg-mystic/8 border border-mystic/20 rounded-xl p-3">
              <p className="text-[10px] text-mystic/60 uppercase tracking-wider mb-1">Économies Relay</p>
              <p className="text-sm font-bold text-mystic">{formatCost(relaySavedTokens * 0.00015)} économisés</p>
              <p className="text-[10px] text-silk/30">~{Math.round(relaySavedTokens / (run.totalTokens || 1) * 100)}% de compression</p>
            </div>
          )}

          {/* Agents par perf */}
          {completedMessages.length > 0 && (
            <div className="bg-graphite-light border border-crystal rounded-xl p-3">
              <p className="text-[10px] text-silk/30 uppercase tracking-wider mb-2">Output par agent</p>
              {completedMessages.map((msg) => {
                const agent = msg.agentId ? getAgent(msg.agentId) : null;
                if (!agent) return null;
                const pct = Math.min(100, Math.round(msg.content.length / 30));
                return (
                  <div key={msg.id} className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] text-silk/50 w-16 truncate shrink-0">{agent.name}</span>
                    <div className="flex-1 h-1.5 bg-crystal rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: 0.1 }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${agent.colors[0]}, ${agent.colors[1]})` }} />
                    </div>
                    <span className="text-[9px] text-silk/25 w-8 text-right">{(msg.content.length / 1000).toFixed(1)}k</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Mode Présentation ─────────────────────────────────────── */}
      {view === "presentation" && (
        <div className="flex-1 flex flex-col min-h-0">
          {completedMessages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-silk/30 text-sm">Aucun livrable</div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4">
                {(() => {
                  const msg = completedMessages[presentationIndex];
                  const agent = msg.agentId ? getAgent(msg.agentId) : null;
                  return (
                    <motion.div key={presentationIndex}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      className="flex flex-col gap-3">
                      {agent && (
                        <div className="flex items-center gap-2">
                          <AgentAvatar colors={agent.colors as [string,string]} name={agent.name} size={28} />
                          <div>
                            <p className="text-sm font-bold text-silk">{agent.name}</p>
                            <p className="text-[10px] text-silk/40">{agent.role}</p>
                          </div>
                        </div>
                      )}
                      <div className="bg-graphite-light border border-crystal rounded-xl p-4">
                        <MarkdownMessage content={msg.content} compact={false} />
                      </div>
                    </motion.div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2 px-3 py-2 border-t border-crystal/40 shrink-0">
                <button disabled={presentationIndex === 0}
                  onClick={() => setPresentationIndex((p) => p - 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/30 disabled:opacity-20 hover:text-silk hover:bg-crystal transition-all">
                  <ChevronDown size={13} className="rotate-90" />
                </button>
                <span className="flex-1 text-center text-[10px] text-silk/30">
                  {presentationIndex + 1} / {completedMessages.length}
                </span>
                <button disabled={presentationIndex === completedMessages.length - 1}
                  onClick={() => setPresentationIndex((p) => p + 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/30 disabled:opacity-20 hover:text-silk hover:bg-crystal transition-all">
                  <ChevronDown size={13} className="-rotate-90" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Onglet Visuels — version compacte + lien Studio ─────────── */}
      {view === "visuals" && <VisualsCompactTab />}

      {/* ── Onglet Fichiers (Phase 8B) ────────────────────────────── */}
      {view === "files" && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0">
          {generatedFiles.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-silk/30 text-xs">Aucun fichier généré</div>
          ) : generatedFiles.map((f) => {
            const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
            const icon = ext === "xlsx" || ext === "csv" ? "📊"
              : ext === "pdf" ? "📑"
              : ext === "pptx" ? "📊"
              : ext === "docx" ? "📝"
              : "📄";
            return (
              <div key={f.id} className="flex items-center gap-3 bg-graphite-light border border-crystal rounded-xl px-3 py-2.5">
                <span className="text-xl shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-silk truncate">{f.name}</p>
                  <p className="text-[10px] text-silk/30">{(f.size_bytes / 1024).toFixed(1)} Ko</p>
                </div>
                <button
                  onClick={() => downloadFile(f.local_path, f.name)}
                  className="flex items-center gap-1 text-[10px] text-electric/70 hover:text-electric border border-electric/30 rounded-lg px-2 py-1 transition-all shrink-0">
                  <Download size={10} /> Télécharger
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Boutons export — toujours visibles ───────────────────── */}
      <div className="p-3 border-t border-crystal/50 flex flex-col gap-2 shrink-0 bg-graphite">
        <Button variant="primary" size="sm" onClick={copyForClaudeCode}>
          <Terminal size={12} /> Copier pour Claude Code
        </Button>
        <Button variant="glass" size="sm" onClick={copyClientReport}>
          📄 Rapport client
        </Button>
        <Button variant="glass" size="sm" onClick={copyAllMarkdown}>
          <Copy size={12} /> Tout copier en Markdown
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1" onClick={downloadMarkdown} loading={exporting}>
            <Download size={12} /> .md
          </Button>
          <Button variant="ghost" size="sm" className="flex-1" onClick={downloadHtml} loading={exporting}>
            <Code2 size={12} /> .html
          </Button>
        </div>
      </div>
    </div>
  );
}

function VisualsCompactTab() {
  const { visuals, isGenerating } = useVisualStore();
  const images = visuals.filter((v) => v.type === "image");
  const videos = visuals.filter((v) => v.type === "video");
  const audios = visuals.filter((v) => v.type === "audio");
  const totalCount = visuals.length;

  if (totalCount === 0 && !isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
        <span className="text-2xl">🎨</span>
        <p className="text-xs text-silk/30">Ajoute Pixel, Motion ou Voice dans ta chaîne pour générer des visuels.</p>
        <button onClick={() => document.dispatchEvent(new CustomEvent("navigate-visual-studio"))}
          className="text-[10px] text-electric/60 hover:text-electric mt-1 flex items-center gap-1">
          <Sparkles size={10} /> Ouvrir Studio Visuel
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0">
      {isGenerating && (
        <div className="flex items-center gap-2 px-3 py-2 bg-electric/5 border border-electric/20 rounded-xl">
          <motion.div className="w-3 h-3 rounded-full border border-electric/50 border-t-electric"
            animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} />
          <span className="text-[10px] text-electric/60">Pixel génère des visuels…</span>
        </div>
      )}

      {/* Thumbnails compacts */}
      {images.length > 0 && (
        <div>
          <p className="text-[9px] text-silk/30 uppercase tracking-widest mb-1.5">🖼️ Images ({images.length})</p>
          <div className="flex gap-1.5 flex-wrap">
            {images.slice(0, 4).map((v) => (
              <div key={v.id} className="w-14 h-14 rounded-lg overflow-hidden border border-crystal/50 bg-graphite">
                <img src={convertFileSrc(v.local_path)} alt="" className="w-full h-full object-cover"
                  onError={(e) => { if (v.url) (e.target as HTMLImageElement).src = v.url; }} />
              </div>
            ))}
            {images.length > 4 && <div className="w-14 h-14 rounded-lg border border-crystal/50 bg-graphite flex items-center justify-center text-[10px] text-silk/30">+{images.length - 4}</div>}
          </div>
        </div>
      )}
      {videos.length > 0 && <p className="text-[9px] text-silk/40">🎬 {videos.length} vidéo{videos.length > 1 ? "s" : ""}</p>}
      {audios.length > 0 && <p className="text-[9px] text-silk/40">🔊 {audios.length} audio{audios.length > 1 ? "s" : ""}</p>}

      <button onClick={() => document.dispatchEvent(new CustomEvent("navigate-visual-studio"))}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-electric/30 bg-electric/5 text-[11px] font-medium text-electric/80 hover:bg-electric/10 transition-all mt-auto">
        <Sparkles size={12} /> Ouvrir le Studio Visuel →
      </button>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color?: string }) {
  return (
    <div className={cn("rounded-xl border border-crystal bg-graphite-light p-3", color === "mystic" && "border-mystic/20 bg-mystic/5")}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{icon}</span>
        <p className="text-[10px] text-silk/30 uppercase tracking-wider">{label}</p>
      </div>
      <p className={cn("text-sm font-bold", color === "mystic" ? "text-mystic" : "text-silk")}>{value}</p>
    </div>
  );
}
