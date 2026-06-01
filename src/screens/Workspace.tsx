import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Trash2, Settings2, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { OrchestratorChat } from "@/components/workspace/OrchestratorChat";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { Badge } from "@/components/ui/Badge";
import { useAgentStore } from "@/store/agentStore";
import { useAgentChatStore } from "@/store/agentChatStore";
import { useAgentChat } from "@/hooks/useAgentChat";
import { useProjectStore } from "@/store/projectStore";
import { useProjectFolder } from "@/hooks/useProjectFolder";
import { convertFileSrc } from "@tauri-apps/api/core";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { useToastStore } from "@/store/toastStore";
import { cn } from "@/lib/utils";

// ─── Affiche les fichiers générés par tool use ────────────────────────────────
function FilesPanel({ agentId }: { agentId: string }) {
  const { generatedFiles } = useAgentChatStore();
  const toast = useToastStore();
  const files = generatedFiles.filter((f) => f.agentId === agentId);
  if (files.length === 0) return null;

  const download = async (path: string, name: string) => {
    try {
      const dest = await saveDialog({ defaultPath: name });
      if (dest) {
        const res = await fetch(convertFileSrc(path));
        const buf = await res.arrayBuffer();
        await writeFile(dest, new Uint8Array(buf));
        toast.success("Téléchargé", name);
      }
    } catch (e) { toast.error("Erreur", String(e)); }
  };

  const extIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "xlsx" || ext === "csv") return "📊";
    if (ext === "pdf") return "📄";
    if (ext === "pptx") return "📱";
    if (ext === "docx") return "📝";
    return "📁";
  };

  return (
    <div className="shrink-0 border-t border-crystal/50 bg-graphite px-3 py-2">
      <p className="text-[10px] text-silk/30 uppercase tracking-widest mb-1.5">Fichiers générés</p>
      <div className="flex flex-col gap-1.5">
        {files.map((f) => (
          <div key={f.id} className="flex items-center gap-2 bg-graphite-light border border-crystal rounded-xl px-2.5 py-1.5">
            <span className="text-base shrink-0">{extIcon(f.name)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-silk truncate">{f.name}</p>
              <p className="text-[10px] text-silk/30">{(f.size_bytes / 1024).toFixed(1)} Ko</p>
            </div>
            <button
              onClick={() => download(f.local_path, f.name)}
              className="text-[10px] text-electric/70 hover:text-electric border border-electric/30 rounded-lg px-2 py-0.5 transition-all shrink-0">
              Télécharger
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar : liste des agents ──────────────────────────────────────────────
function AgentSidebar() {
  const navigate = useNavigate();
  const { agents } = useAgentStore();
  const { activeAgentId, setActiveAgent, getMessages, clearConversation } = useAgentChatStore();

  // Agents visibles (non-système sauf relay)
  const visibleAgents = agents.filter((a) => a.id !== "relay");

  return (
    <div className="flex flex-col h-full bg-graphite border-r border-crystal/50 w-56 shrink-0">
      <div className="px-3 pt-3 pb-2 border-b border-crystal/50 shrink-0">
        <p className="text-[9px] uppercase tracking-widest text-silk/30 font-medium">Agents</p>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {visibleAgents.map((agent) => {
          const isActive = agent.id === activeAgentId;
          const msgCount = getMessages(agent.id).filter(m => m.role !== "system").length;
          return (
            <button
              key={agent.id}
              onClick={() => setActiveAgent(agent.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-all rounded-xl mx-1 my-0.5",
                isActive
                  ? "bg-electric/10 border border-electric/20"
                  : "hover:bg-graphite-light border border-transparent"
              )}
            >
              <AgentAvatar
                colors={agent.colors as [string, string]}
                name={agent.name}
                size={28}
              />
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-medium truncate", isActive ? "text-silk" : "text-silk/70")}>
                  {agent.name}
                </p>
                <p className="text-[10px] text-silk/30 truncate">{agent.role}</p>
              </div>
              {msgCount > 0 && (
                <span className="text-[9px] text-electric/60 font-medium shrink-0">{msgCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Actions bas de sidebar */}
      <div className="shrink-0 border-t border-crystal/50 p-2 flex gap-1">
        <button
          onClick={() => navigate("/orchestrator")}
          title="Gérer les agents"
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-[10px] text-silk/40 hover:text-silk/70 hover:bg-graphite-light transition-all">
          <Wrench size={11} /> Gérer
        </button>
        <button
          onClick={() => clearConversation(activeAgentId)}
          title="Effacer la conversation"
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-[10px] text-silk/40 hover:text-silk/70 hover:bg-graphite-light transition-all">
          <Trash2 size={11} /> Effacer
        </button>
      </div>
    </div>
  );
}

// ─── En-tête de la zone de chat ───────────────────────────────────────────────
function ChatHeader({ agentId }: { agentId: string }) {
  const navigate = useNavigate();
  const { getAgent } = useAgentStore();
  const agent = getAgent(agentId);
  if (!agent) return null;

  const connectorCount = agent.connectors?.length ?? 0;

  return (
    <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-crystal/50 bg-graphite">
      <div className="flex items-center gap-2.5">
        <AgentAvatar colors={agent.colors as [string, string]} name={agent.name} size={30} />
        <div>
          <p className="text-sm font-medium text-silk">{agent.name}</p>
          <p className="text-[10px] text-silk/40">{agent.role}</p>
        </div>
        {connectorCount > 0 && (
          <Badge variant="ghost" className="text-[9px]">
            {connectorCount} outil{connectorCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>
      <button
        onClick={() => navigate("/studio")}
        title="Configurer l'agent"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/30 hover:text-silk/60 hover:bg-crystal transition-all">
        <Settings2 size={14} />
      </button>
    </div>
  );
}

// ─── Workspace principal ──────────────────────────────────────────────────────
export function Workspace() {
  const { activeAgentId } = useAgentChatStore();
  const { sendMessage } = useAgentChat();
  const { getActiveProject } = useProjectStore();
  const { summary, readFolder } = useProjectFolder();
  const project = getActiveProject();
  const startupDone = useRef(false);
  const { getAgent } = useAgentStore();
  const { getMessages } = useAgentChatStore();

  // Lire le dossier si projet lié
  useEffect(() => {
    if (project?.path && project.path !== "/") {
      readFolder(project.path);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.path]);

  // Message de bienvenue Marcus au premier lancement du projet
  useEffect(() => {
    if (startupDone.current) return;
    if (!project) return;
    const messages = getMessages("marcus");
    if (messages.length > 0) return;
    startupDone.current = true;

    const marcus = getAgent("marcus");
    if (!marcus) return;

    // Le message de démarrage arrive via useAgentChat
    const greeting = `Bonjour ! Je suis Marcus, ton Directeur de Projet IA. Je suis prêt à t'aider sur **${project.name}**. Que veux-tu accomplir aujourd'hui ?`;
    void import("@/store/agentChatStore").then(({ useAgentChatStore: s }) => {
      s.getState().addMessage("marcus", { role: "assistant", agentId: "marcus", content: greeting });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const handleSend = (text: string) => {
    sendMessage(text);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar agents */}
      <AgentSidebar />

      {/* Zone de chat */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* En-tête agent actif */}
        <ChatHeader agentId={activeAgentId} />

        {/* Indicateur dossier lié */}
        {summary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="shrink-0 px-3 py-1 border-b border-crystal/30 bg-graphite/50 flex items-center gap-1.5">
            <span className="text-[10px] text-silk/40">📁 {summary.total_files} fichiers connectés</span>
          </motion.div>
        )}

        {/* Chat */}
        <div className="flex-1 overflow-hidden min-h-0">
          <OrchestratorChat
            onSend={handleSend}
            hasFolder={!!(project?.path && project.path !== "/")}
          />
        </div>

        {/* Fichiers générés */}
        <FilesPanel agentId={activeAgentId} />
      </div>
    </div>
  );
}
