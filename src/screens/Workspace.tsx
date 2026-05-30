import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Square, Package, BookOpen, AlertCircle,
  ChefHat, CheckCircle2, Zap, MessageSquare, Loader2,
  Users, ChevronDown, Trash2, Play,
} from "lucide-react";
import { ChainModeSelector } from "@/components/workspace/ChainModePicker";
import { OrchestratorChat } from "@/components/workspace/OrchestratorChat";
import { DeliverablePanel } from "@/components/workspace/DeliverablePanel";
import { JournalPanel } from "@/components/workspace/JournalPanel";
import { LibraryPanel } from "@/components/workspace/LibraryPanel";
import { ReworkModal } from "@/components/workspace/ReworkModal";
import { ProjectDashboard } from "@/components/workspace/ProjectDashboard";
import { StopModal } from "@/components/workspace/StopModal";
import { AgentFlowViz } from "@/components/workspace/AgentFlowViz";
import { BudgetCounter } from "@/components/workspace/BudgetCounter";
import { ChainProposalCard } from "@/components/workspace/ChainProposalCard";
import { FolderContextBar } from "@/components/workspace/FolderContextBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useProjectStore } from "@/store/projectStore";
import { useAgentStore } from "@/store/agentStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useChainRunner } from "@/hooks/useChainRunner";
import { useJournalWatcher } from "@/hooks/useJournalWatcher";
import { useMarcusChat } from "@/hooks/useMarcusChat";
import { useMarcusPlan } from "@/hooks/useMarcusPlan";
import { useProjectFolder } from "@/hooks/useProjectFolder";
import { useToastStore } from "@/store/toastStore";
import { useProjectMemory } from "@/hooks/useProjectMemory";
import { buildStartupContext } from "@/lib/startupBriefing";
import { loadLibrary } from "@/lib/libraryManager";
import { useChainStore } from "@/store/chainStore";
import { cn } from "@/lib/utils";

type SideTab = "livrables" | "journal" | "library";

// Brief pré-construit pour l'analyse de projet
const ANALYSIS_BRIEF = (folderName: string) =>
  `Analyse complète du projet "${folderName}" : architecture technique, stack utilisée, qualité du code, points forts, points d'amélioration et recommandations concrètes. Produis un compte rendu structuré et actionnable.`;

export function Workspace() {
  const [sideTab, setSideTab] = useState<SideTab>("livrables");
  const [reworkEntry, setReworkEntry] = useState<import("@/types").DeliverableEntry | null>(null);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const { getActiveProject, updateProject } = useProjectStore();
  const { getTeamAgents, teams, getTeam } = useAgentStore();
  const deleteTeam = useAgentStore((s) => s.deleteTeam);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const teamPickerRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    if (!showTeamPicker) return;
    const handler = (e: MouseEvent) => {
      if (teamPickerRef.current && !teamPickerRef.current.contains(e.target as Node)) {
        setShowTeamPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTeamPicker]);
  const {
    run, resumeFromChef, resumeFromAgent, workspaceMessages, pauseAfterCurrent,
    proposal, proposalLoading, setProposal,
    pausedAgentMessage,
  } = useChainStore();
  const { hasValidApiKey } = useSettingsStore();
  const project = getActiveProject();
  const teamId = project?.teamId ?? "alpha";
  const team = getTeam(teamId);
  const agents = getTeamAgents(teamId);

  const switchTeam = (id: string) => {
    if (project) updateProject(project.id, { teamId: id });
    setShowTeamPicker(false);
    // On garde la conversation — juste un message informatif
    if (id !== teamId) {
      const newTeam = useAgentStore.getState().getTeam(id);
      useChainStore.getState().addWorkspaceMessage({
        role: "system",
        content: `Équipe changée → **${newTeam?.name ?? id}** (${newTeam?.agentIds.length ?? 0} agents). La prochaine chaîne utilisera cette équipe.`,
      });
    }
  };
  const { runChain, stop } = useChainRunner(teamId);
  const { sendToMarcus } = useMarcusChat();
  const { buildPlan } = useMarcusPlan();
  const { loading: folderLoading, summary, pickFolder, readFolder, buildFolderContext } = useProjectFolder();
  const { saveState } = useProjectMemory();
  const briefingDone = useRef(false);

  const { content: journalContent, watching } = useJournalWatcher(
    project?.path && project.path !== "/" ? project.path : null
  );

  const isRunning = run.status === "running";
  const isPausedChef = run.status === "paused_chef";
  const isPausedAgent = run.status === "paused_agent";
  const isCompleted = run.status === "completed";

  // Auto-save état projet à la fin de chaque chaîne
  useEffect(() => {
    if (isCompleted && run.messages.length > 0) {
      saveState();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted]);
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

    // Briefing intelligent basé sur le contexte disponible
    void (async () => {
      // Charger le dernier livrable pour enrichir le contexte
      let lastDeliverable = null;
      try {
        const library = await loadLibrary(project.path ?? null);
        lastDeliverable = library[0] ?? null;
      } catch { /* silencieux */ }

      // Construire le contexte adapté (4 cas)
      const startupPrompt = buildStartupContext(
        project,
        journalContent,
        summary,
        lastDeliverable,
      );

      sendToMarcus(startupPrompt, []);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  // ── Marcus propose de sauvegarder l'équipe (2.13) ───────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { score } = (e as CustomEvent).detail as { agentIds: string[]; score: number };
      useToastStore.getState().success(
        `Équipe ⭐ ${score}/10`,
        "Sauvegarder cette configuration ?",
      );
    };
    document.addEventListener("suggest-save-team", handler);
    return () => document.removeEventListener("suggest-save-team", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Raccourcis clavier Cmd+L / Cmd+S ────────────────────────────
  useEffect(() => {
    const onLaunch = () => { if (!isRunning && !proposalLoading) handleRequestPlan(); };
    const onStop   = () => { if (isRunning) stop(); };
    document.addEventListener("chain-launch", onLaunch);
    document.addEventListener("chain-stop",   onStop);
    return () => {
      document.removeEventListener("chain-launch", onLaunch);
      document.removeEventListener("chain-stop",   onStop);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, proposalLoading]);

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
    const folderName = project?.path?.split(/[\\/]/).pop() ?? "Projet";
    const brief = ANALYSIS_BRIEF(folderName);
    const folderCtx = buildFolderContext(summary);
    runChain(brief, project?.name ?? "Projet", ["nina", "tom", "sam"], folderCtx);
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
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-silk truncate">{project?.name ?? "Workspace"}</p>
          </div>

          {/* Sélecteur d'équipe */}
          <div className="relative" ref={teamPickerRef}>
            <button
              onClick={() => setShowTeamPicker(!showTeamPicker)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-crystal hover:border-crystal-light bg-transparent hover:bg-graphite-light transition-all group"
            >
              <Users size={11} className="text-silk/40 shrink-0" />
              <span className="text-[11px] text-silk/60 max-w-[110px] truncate">{team?.name ?? "Équipe"}</span>
              <ChevronDown size={10} className={cn("text-silk/30 transition-transform shrink-0", showTeamPicker && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showTeamPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full mt-1 left-0 z-50 bg-graphite border border-crystal rounded-xl overflow-hidden shadow-2xl min-w-[180px]"
                >
                  {teams.map((t) => (
                    <div
                      key={t.id}
                      className={cn(
                        "flex items-center group transition-colors",
                        t.id === teamId ? "bg-electric/10" : "hover:bg-graphite-light",
                      )}
                    >
                      <button
                        onClick={() => switchTeam(t.id)}
                        className={cn(
                          "flex-1 flex items-center justify-between px-3 py-2 text-xs text-left",
                          t.id === teamId ? "text-electric" : "text-silk/60 hover:text-silk",
                        )}
                      >
                        <span className="font-medium">{t.name}</span>
                        <span className="text-[10px] text-silk/30 ml-3">{t.agentIds.length}</span>
                      </button>
                      {t.id !== "alpha" && (
                        <button
                          onClick={() => {
                            if (t.id === teamId) switchTeam("alpha");
                            deleteTeam(t.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 w-7 h-full flex items-center justify-center text-silk/20 hover:text-danger transition-all shrink-0 pr-2"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!hasValidApiKey() && (
            <Badge variant="warning"><AlertCircle size={10} /> Mode démo</Badge>
          )}
        </div>

        {/* ── Sélecteur Mode de Chaîne ─────────────────────────── */}
        <ChainModeSelector />

        <div className="flex items-center gap-2 shrink-0">
          <BudgetCounter />
          <button onClick={() => setShowDashboard(true)} title="Dashboard projet"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-silk/25 hover:text-silk/60 hover:bg-crystal transition-all text-sm">
            📊
          </button>
          {isRunning ? (
            <Button variant="danger" size="sm" onClick={() => setShowStopModal(true)}>
              <Square size={12} /> Stop
            </Button>
          ) : isPausedChef ? (
            <Button variant="mystic" size="sm" onClick={resumeFromChef}>
              <ChefHat size={12} /> Valider
            </Button>
          ) : isPausedAgent ? (
            <Button variant="warning" size="sm" onClick={resumeFromAgent}>
              <Play size={12} /> Continuer
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
        {isPausedAgent && (
          <motion.div
            key="agent-pause-banner"
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-3 px-4 py-2.5 bg-warning/10 border-b border-warning/25 shrink-0"
          >
            <span className="text-warning text-sm shrink-0">⏸</span>
            <p className="text-xs text-silk/70 flex-1">
              <span className="text-warning font-semibold">Pause agent</span>
              {pausedAgentMessage
                ? <> — {pausedAgentMessage}</>
                : <> — Lisez l'output avant de continuer.</>}
            </p>
            <Button variant="warning" size="sm" onClick={resumeFromAgent}>
              <Play size={12} /> Continuer
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
        {(isRunning || isCompleted || isPausedChef || isPausedAgent) && (
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
              hasFolder={hasFolder && !!summary}
              hasLastDeliverable={!!useChainStore.getState().lastDeliverableContent}
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

        {/* Toggle button — toujours visible sur le bord */}
        <button
          onClick={() => setSidePanelOpen((v) => !v)}
          title={sidePanelOpen ? "Réduire le panneau" : "Ouvrir le panneau"}
          className={cn(
            "flex items-center justify-center shrink-0 border-l border-crystal/50 transition-all",
            "text-silk/25 hover:text-silk/60 hover:bg-graphite-light",
            "w-5 self-stretch",
          )}
        >
          <motion.span
            animate={{ rotate: sidePanelOpen ? 0 : 180 }}
            transition={{ duration: 0.2 }}
            className="text-[10px] leading-none"
          >
            ‹
          </motion.span>
        </button>

        {/* Side panel — rétractable */}
        <AnimatePresence initial={false}>
          {sidePanelOpen && (
            <motion.div
              key="side-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "38%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="flex flex-col overflow-hidden shrink-0 border-l border-crystal/50"
            >
          <div className="flex border-b border-crystal/50 shrink-0">
            {(["livrables", "journal", "library"] as SideTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setSideTab(tab)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-all",
                  sideTab === tab
                    ? "text-electric border-b-2 border-electric -mb-px"
                    : "text-silk/35 hover:text-silk/60",
                )}
              >
                {tab === "livrables" && <Package size={11} />}
                {tab === "journal" && <BookOpen size={11} />}
                {tab === "library" && <span className="text-sm leading-none">📚</span>}
                {tab === "livrables" ? "Livrables" : tab === "journal" ? "Journal" : "Biblio"}
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
                {sideTab === "livrables" && <DeliverablePanel />}
                {sideTab === "journal" && <JournalPanel journalContent={journalContent} watching={watching} />}
                {sideTab === "library" && (
                  <LibraryPanel
                    onOpen={() => setSideTab("livrables")}
                    onRework={(entry) => setReworkEntry(entry)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dashboard projet */}
      <ProjectDashboard open={showDashboard} onClose={() => setShowDashboard(false)} />

      {/* Modal Stop intelligent */}
      <StopModal
        open={showStopModal}
        currentAgentName={agents[run.currentAgentIndex]?.name ?? "Agent"}
        onPause={() => { pauseAfterCurrent(); setShowStopModal(false); }}
        onStop={() => { stop(); setShowStopModal(false); }}
        onCancel={() => setShowStopModal(false)}
      />

      {/* Modal Retravailler */}
      <ReworkModal
        entry={reworkEntry}
        onClose={() => setReworkEntry(null)}
        onLaunchChain={(brief) => {
          setReworkEntry(null);
          handleRequestPlan();
          // Le brief sera utilisé au prochain lancement
          useChainStore.getState().addWorkspaceMessage({ role: "user", content: brief });
        }}
      />
    </div>
  );
}
