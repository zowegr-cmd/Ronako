import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Square, Package, BookOpen, AlertCircle,
  ChefHat, CheckCircle2, Zap, MessageSquare, Loader2,
} from "lucide-react";
import { OrchestratorChat } from "@/components/workspace/OrchestratorChat";
import { DeliverablePanel } from "@/components/workspace/DeliverablePanel";
import { JournalPanel } from "@/components/workspace/JournalPanel";
import { AgentFlowViz } from "@/components/workspace/AgentFlowViz";
import { BudgetCounter } from "@/components/workspace/BudgetCounter";
import { ChainProposalCard } from "@/components/workspace/ChainProposalCard";
import { FolderContextBar } from "@/components/workspace/FolderContextBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useProjectStore } from "@/store/projectStore";
import { useAgentStore } from "@/store/agentStore";
import { useChainStore } from "@/store/chainStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useChainRunner } from "@/hooks/useChainRunner";
import { useJournalWatcher } from "@/hooks/useJournalWatcher";
import { useMarcusChat } from "@/hooks/useMarcusChat";
import { useMarcusPlan } from "@/hooks/useMarcusPlan";
import { useProjectFolder } from "@/hooks/useProjectFolder";
import { cn } from "@/lib/utils";

type SideTab = "livrables" | "journal";

// Brief pré-construit pour l'analyse de projet
const ANALYSIS_BRIEF = (folderName: string) =>
  `Analyse complète du projet "${folderName}" : architecture technique, stack utilisée, qualité du code, points forts, points d'amélioration et recommandations concrètes. Produis un compte rendu structuré et actionnable.`;

export function Workspace() {
  const [sideTab, setSideTab] = useState<SideTab>("livrables");
  const { getActiveProject, updateProject } = useProjectStore();
  const { getTeamAgents } = useAgentStore();
  const {
    run, resumeFromChef, workspaceMessages,
    proposal, proposalLoading, setProposal,
  } = useChainStore();
  const { hasValidApiKey } = useSettingsStore();
  const project = getActiveProject();
  const teamId = project?.teamId ?? "alpha";
  const agents = getTeamAgents(teamId);
  const { runChain, stop } = useChainRunner(teamId);
  const { sendToMarcus } = useMarcusChat();
  const { buildPlan } = useMarcusPlan();
  const { loading: folderLoading, summary, pickFolder, readFolder, buildFolderContext } = useProjectFolder();
  const briefingDone = useRef(false);

  const { content: journalContent, watching } = useJournalWatcher(
    project?.path && project.path !== "/" ? project.path : null
  );

  const isRunning = run.status === "running";
  const isPausedChef = run.status === "paused_chef";
  const isCompleted = run.status === "completed";
  const showProposal = !!proposal && !isRunning;
  const hasFolder = !!project?.path && project.path !== "/";

  // ── Lecture auto du dossier quand le projet change ───────────────
  useEffect(() => {
    if (hasFolder && project?.path) {
      readFolder(project.path);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.path]);

  // ── Briefing Marcus au démarrage ─────────────────────────────────
  useEffect(() => {
    if (briefingDone.current || !project || workspaceMessages.length > 0) return;
    briefingDone.current = true;

    const journalNote = journalContent
      ? `\n\nJournal Claude Code :\n${journalContent.slice(0, 600)}`
      : "";
    const folderNote = hasFolder && project.path
      ? `\n\nDossier lié : ${project.path}`
      : "";

    sendToMarcus(
      `Bonjour, le projet "${project.name}" vient d'être ouvert.${journalNote}${folderNote}\n\nFais un briefing de démarrage et demande ce que l'utilisateur veut accomplir.`,
      []
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  // ── Conversation Marcus ──────────────────────────────────────────
  const handleChat = (text: string) => {
    if (isRunning) return;
    setProposal(null);
    sendToMarcus(text, workspaceMessages);
  };

  // ── Lancer la chaîne via proposition Marcus ──────────────────────
  const handleRequestPlan = async () => {
    if (isRunning || proposalLoading) return;
    setProposal(null);
    await buildPlan();
  };

  const handleConfirmPlan = (brief: string, agentIds: string[]) => {
    setProposal(null);
    const folderCtx = summary && project?.path ? buildFolderContext(summary) : undefined;
    runChain(brief, project?.name ?? "Projet", agentIds, folderCtx);
  };

  // ── Analyser le projet (chain dédiée) ───────────────────────────
  const handleAnalyzeProject = async () => {
    if (!summary || isRunning) return;
    setProposal(null);
    const folderCtx = buildFolderContext(summary);
    const folderName = project?.path?.split(/[\\/]/).pop() ?? "Projet";
    const brief = ANALYSIS_BRIEF(folderName);

    // Chain dédiée analyse : Nina + Tom + Sam
    const folderCtxForPlan = summary ? buildFolderContext(summary) : undefined;
    runChain(brief, project?.name ?? "Projet", ["nina", "tom", "sam"], folderCtxForPlan);
  };

  // ── Picker dossier ───────────────────────────────────────────────
  const handlePickFolder = async () => {
    const selected = await pickFolder();
    if (selected) await readFolder(selected);
  };

  const handleUnlinkFolder = () => {
    if (project) updateProject(project.id, { path: "/" });
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-crystal/50 shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-silk truncate">{project?.name ?? "Workspace"}</p>
          </div>
          {!hasValidApiKey() && (
            <Badge variant="warning"><AlertCircle size={10} /> Mode démo</Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <BudgetCounter />
          {isRunning ? (
            <Button variant="danger" size="sm" onClick={stop}>
              <Square size={12} /> Stop
            </Button>
          ) : isPausedChef ? (
            <Button variant="mystic" size="sm" onClick={resumeFromChef}>
              <ChefHat size={12} /> Valider
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              disabled={proposalLoading || isRunning}
              onClick={handleRequestPlan}
            >
              {proposalLoading
                ? <><Loader2 size={12} className="animate-spin" /> Planification…</>
                : <><Zap size={12} /> Lancer la chaîne</>}
            </Button>
          )}
        </div>
      </div>

      {/* ── Folder context bar ──────────────────────────────────── */}
      <FolderContextBar
        path={project?.path ?? null}
        summary={summary}
        loading={folderLoading}
        onPick={handlePickFolder}
        onRefresh={() => project?.path && readFolder(project.path)}
        onAnalyze={handleAnalyzeProject}
        onUnlink={handleUnlinkFolder}
      />

      {/* ── Bandeaux contextuels ─────────────────────────────────── */}
      <AnimatePresence>
        {!isRunning && !isPausedChef && !isCompleted && !showProposal && (
          <motion.div
            key="conv-banner"
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-electric/5 border-b border-electric/10 shrink-0"
          >
            <MessageSquare size={12} className="text-electric/60 shrink-0" />
            <p className="text-[11px] text-silk/40">
              Conversation avec <span className="text-electric/70 font-medium">Marcus</span> —
              briefez-le, puis cliquez <span className="text-mystic/70 font-medium">Lancer la chaîne</span>.
              {hasFolder && summary && (
                <span className="text-success/60 ml-1">
                  · Dossier chargé ({summary.total_files} fichiers)
                </span>
              )}
            </p>
          </motion.div>
        )}
        {isRunning && (
          <motion.div
            key="running-banner"
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-mystic/5 border-b border-mystic/15 shrink-0"
          >
            <Zap size={12} className="text-mystic shrink-0 animate-pulse" />
            <p className="text-[11px] text-silk/50">Chaîne en cours d'exécution…</p>
          </motion.div>
        )}
        {isPausedChef && (
          <motion.div
            key="chef-banner"
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-3 px-4 py-2.5 bg-mystic/10 border-b border-mystic/20 shrink-0"
          >
            <ChefHat size={14} className="text-mystic shrink-0" />
            <p className="text-xs text-silk/70 flex-1">
              <span className="text-mystic font-semibold">Option Chef</span> — Consultez les livrables, puis validez.
            </p>
            <Button variant="mystic" size="sm" onClick={resumeFromChef}>
              <CheckCircle2 size={12} /> Valider
            </Button>
          </motion.div>
        )}
        {isCompleted && (
          <motion.div
            key="done-banner"
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-success/8 border-b border-success/15 shrink-0"
          >
            <CheckCircle2 size={13} className="text-success shrink-0" />
            <p className="text-xs text-success/80">Chaîne terminée — livrables disponibles à droite.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Agent flow ───────────────────────────────────────────── */}
      <AnimatePresence>
        {(isRunning || isCompleted || isPausedChef) && (
          <motion.div
            key="flow-viz"
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 border-b border-crystal/30 shrink-0"
          >
            <AgentFlowViz agents={agents} currentIndex={run.currentAgentIndex} isRunning={isRunning} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main layout ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <AnimatePresence>
            {isRunning && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-onyx/20 pointer-events-none z-10"
              />
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-hidden">
            <OrchestratorChat
              onSend={handleChat}
              disabled={isRunning || proposalLoading}
              placeholder={
                isRunning ? "Chaîne en cours…"
                  : proposalLoading ? "Marcus prépare la proposition…"
                    : hasFolder && summary
                      ? `Discutez avec Marcus — ${summary.total_files} fichiers de votre projet sont disponibles pour analyse…`
                      : "Discutez avec Marcus — décrivez votre projet…"
              }
            />
          </div>

          {/* Proposition de chaîne inline */}
          <AnimatePresence>
            {showProposal && proposal && (
              <ChainProposalCard
                proposal={proposal}
                onConfirm={handleConfirmPlan}
                onCancel={() => setProposal(null)}
                loading={isRunning}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Side panel */}
        <div className="w-[38%] flex flex-col overflow-hidden shrink-0 border-l border-crystal/50">
          <div className="flex border-b border-crystal/50 shrink-0">
            {(["livrables", "journal"] as SideTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setSideTab(tab)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all",
                  sideTab === tab
                    ? "text-electric border-b-2 border-electric -mb-px"
                    : "text-silk/35 hover:text-silk/60",
                )}
              >
                {tab === "livrables" ? <Package size={12} /> : <BookOpen size={12} />}
                {tab === "livrables" ? "Livrables" : "Journal"}
                {tab === "journal" && watching && (
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={sideTab}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                {sideTab === "livrables" ? <DeliverablePanel /> : <JournalPanel journalContent={journalContent} watching={watching} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
