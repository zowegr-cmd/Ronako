import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Settings2, Zap, Cpu, Wrench } from "lucide-react";
import { useAgentStore } from "@/store/agentStore";
import { useAgentChatStore } from "@/store/agentChatStore";
import { useConnectorStore } from "@/store/connectorStore";
import { useSettingsStore } from "@/store/settingsStore";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const CONNECTOR_ICONS: Record<string, string> = {
  openai: "🎨", bfl: "🖼️", e2b: "⚙️", notion: "📓", github: "🐙",
  tavily: "🔍", serper: "🔎", elevenlabs: "🔊", runway: "🎬",
  perplexity: "🧠", groq: "⚡", stability: "🖼️",
};

interface AgentCardProps {
  agent: import("@/types").Agent;
  isActive: boolean;
  msgCount: number;
  configuredConnectors: string[];
  onClick: () => void;
  onConfigure: () => void;
}

function AgentCard({ agent, isActive, msgCount, configuredConnectors, onClick, onConfigure }: AgentCardProps) {
  const activeConnectors = (agent.connectors ?? []).filter((c) => configuredConnectors.includes(c));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col gap-3 p-4 rounded-2xl border cursor-pointer transition-all select-none",
        isActive
          ? "border-electric/40 bg-electric/5 shadow-[0_0_12px_rgba(0,122,255,0.08)]"
          : "border-crystal hover:border-crystal-light bg-graphite hover:bg-graphite-light"
      )}
    >
      {isActive && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-electric animate-pulse" />
      )}
      <div className="flex items-start gap-3">
        <AgentAvatar colors={agent.colors as [string, string]} name={agent.name} size={40} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-silk">{agent.name}</p>
          <p className="text-[11px] text-silk/45 mt-0.5">{agent.role}</p>
        </div>
      </div>
      {agent.description && (
        <p className="text-[11px] text-silk/55 leading-relaxed line-clamp-2">{agent.description}</p>
      )}
      {activeConnectors.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {activeConnectors.slice(0, 4).map((c) => (
            <span key={c} title={c}
              className="text-[10px] bg-graphite-light border border-crystal rounded-lg px-1.5 py-0.5 text-silk/50">
              {CONNECTOR_ICONS[c] ?? "🔌"} {c}
            </span>
          ))}
          {activeConnectors.length > 4 && (
            <span className="text-[10px] text-silk/30">+{activeConnectors.length - 4}</span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-crystal/30">
        <div className="flex items-center gap-2">
          {msgCount > 0 && (
            <Badge variant="ghost" className="text-[9px] text-electric/60">{msgCount} msg</Badge>
          )}
          {(!agent.connectors || agent.connectors.length === 0) && (
            <span className="text-[10px] text-silk/25 flex items-center gap-1">
              <Cpu size={9} /> Texte seul
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onConfigure(); }}
          title="Configurer"
          className="w-6 h-6 rounded-lg flex items-center justify-center text-silk/25 hover:text-silk/60 hover:bg-crystal transition-all">
          <Settings2 size={11} />
        </button>
      </div>
    </motion.div>
  );
}

export function Orchestrator() {
  const navigate = useNavigate();
  const { agents } = useAgentStore();
  const { activeAgentId, setActiveAgent, getMessages } = useAgentChatStore();
  const { keys: connectorKeys } = useConnectorStore();
  const { connectorKeys: legacyKeys } = useSettingsStore();

  const configuredConnectors = [
    ...Object.entries(connectorKeys).filter(([, v]) => !!v).map(([k]) => k),
    ...Object.entries(legacyKeys).filter(([, v]) => !!v).map(([k]) => k),
  ];

  const visibleAgents = agents.filter((a) => a.id !== "relay");
  const coreAgents = visibleAgents.filter((a) => !a.id.startsWith("user-"));
  const customAgents = visibleAgents.filter((a) => a.id.startsWith("user-"));

  const handleSelectAgent = (agentId: string) => {
    setActiveAgent(agentId);
    navigate("/workspace");
  };

  const handleConfigure = (_agentId: string) => {
    navigate("/studio");
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent("studio-select-agent", { detail: { agentId: _agentId } }));
    }, 100);
  };

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-silk">Agents disponibles</h1>
          <p className="text-[11px] text-silk/40 mt-0.5">Clique sur un agent pour démarrer une conversation</p>
        </div>
        <button onClick={() => navigate("/studio")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-electric/30 text-electric/80 text-xs hover:bg-electric/10 transition-all">
          <Plus size={13} /> Créer un agent
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {coreAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent}
            isActive={agent.id === activeAgentId}
            msgCount={getMessages(agent.id).filter(m => m.role !== "system").length}
            configuredConnectors={configuredConnectors}
            onClick={() => handleSelectAgent(agent.id)}
            onConfigure={() => handleConfigure(agent.id)} />
        ))}
      </div>

      {customAgents.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Wrench size={12} className="text-silk/30" />
            <p className="text-[10px] uppercase tracking-widest text-silk/30">Agents personnalisés</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {customAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent}
                isActive={agent.id === activeAgentId}
                msgCount={getMessages(agent.id).filter(m => m.role !== "system").length}
                configuredConnectors={configuredConnectors}
                onClick={() => handleSelectAgent(agent.id)}
                onConfigure={() => handleConfigure(agent.id)} />
            ))}
          </div>
        </>
      )}

      <div className="mt-8 p-3 rounded-xl border border-crystal/40 bg-graphite-light flex items-start gap-2.5">
        <Zap size={14} className="text-electric/50 shrink-0 mt-0.5" />
        <p className="text-[11px] text-silk/40 leading-relaxed">
          Configure les <strong className="text-silk/60">connecteurs</strong> de chaque agent dans le{" "}
          <button onClick={() => navigate("/studio")} className="text-electric/60 hover:text-electric underline">
            Studio Agent
          </button>{" "}
          pour activer les outils (E2B pour les fichiers, Tavily pour la recherche, etc.).
        </p>
      </div>
    </div>
  );
}
