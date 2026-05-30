import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Trash2 } from "lucide-react";
import { AgentAvatar } from "./AgentAvatar";
import { Badge } from "@/components/ui/Badge";
import { MarkdownMessage } from "@/components/ui/MarkdownMessage";
import { MODEL_LABELS, MODEL_TIER_COLOR } from "@/types";
import { useAnthropicStream } from "@/hooks/useAnthropicStream";
import { useSettingsStore } from "@/store/settingsStore";
import { useProjectStore } from "@/store/projectStore";
import { useConversationStore } from "@/store/conversationStore";
import { cn } from "@/lib/utils";
import type { Agent } from "@/types";
import { create } from "zustand";

interface AgentChatModalProps {
  agent: Agent | null;
  onClose: () => void;
}

export function AgentChatModal({ agent, onClose }: AgentChatModalProps) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { stream } = useAnthropicStream();
  const { apiKey, hasValidApiKey } = useSettingsStore();
  const { getActiveProject } = useProjectStore();
  const { addMessage, updateLastMessage, finalizeStreaming, clearConversation, getMessages } =
    useConversationStore();

  const agentId = agent?.id ?? "";
  const messages = agentId ? getMessages(agentId) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (agent) setTimeout(() => inputRef.current?.focus(), 100);
  }, [agent?.id]);

  if (!agent) return null;

  const tierColor = MODEL_TIER_COLOR[agent.model];
  const project = getActiveProject();

  const buildContext = () => {
    const parts: string[] = [];
    if (project) parts.push(`Projet actif : ${project.name}`);
    const history = messages
      .filter((m) => m.role !== "streaming")
      .slice(-8)
      .map((m) => `${m.role === "user" ? "Utilisateur" : agent.name}: ${m.content}`)
      .join("\n\n");
    if (history) parts.push(`Historique de conversation :\n${history}`);
    return parts.join("\n\n");
  };

  const sendMessage = () => {
    if (!input.trim() || isStreaming) return;
    const text = input.trim();
    setInput("");

    addMessage(agentId, { role: "user", content: text });

    if (!hasValidApiKey()) {
      addMessage(agentId, {
        role: "assistant",
        content: "Configurez votre clé API Anthropic dans les **Paramètres** pour activer les réponses IA.",
      });
      return;
    }

    addMessage(agentId, { role: "streaming", content: "" });
    setIsStreaming(true);

    const context = buildContext();
    const userMessage = context ? `${context}\n\nUtilisateur: ${text}` : text;

    stream({
      apiKey,
      model: agent.model,
      systemPrompt: agent.systemPrompt,
      userMessage,
      onChunk: (chunk) => {
        const current = getMessages(agentId).at(-1)?.content ?? "";
        updateLastMessage(agentId, current + chunk);
      },
      onDone: (full) => {
        finalizeStreaming(agentId, full);
        setIsStreaming(false);
      },
      onError: (err) => {
        finalizeStreaming(agentId, `Erreur : ${err}`);
        setIsStreaming(false);
      },
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        key="agent-chat-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="agent-chat-modal"
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
      >
        <div
          className="pointer-events-auto flex flex-col bg-graphite border border-crystal rounded-2xl shadow-2xl overflow-hidden"
          style={{ width: 520, height: 620 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-crystal shrink-0">
            <AgentAvatar colors={agent.colors as [string, string]} name={agent.name} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-silk">{agent.name}</p>
              <p className="text-[11px] text-silk/40">{agent.role}</p>
            </div>
            <Badge
              variant="ghost"
              style={{ color: tierColor, borderColor: `${tierColor}40`, backgroundColor: `${tierColor}15` } as React.CSSProperties}
            >
              {MODEL_LABELS[agent.model]}
            </Badge>
            <button
              onClick={() => clearConversation(agentId)}
              title="Effacer la conversation"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/25 hover:text-danger/60 hover:bg-danger/10 transition-all"
            >
              <Trash2 size={13} />
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/25 hover:text-silk hover:bg-crystal transition-all"
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-8">
                <AgentAvatar colors={agent.colors as [string, string]} name={agent.name} size={56} />
                <p className="text-sm text-silk/50 max-w-xs leading-relaxed">{agent.description}</p>
                <p className="text-xs text-silk/25">
                  {project ? `Contexte : projet "${project.name}"` : "Aucun projet actif"}
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-2xl px-3 py-2 max-w-[85%]",
                  msg.role === "user"
                    ? "bg-electric/15 text-silk self-end rounded-tr-sm text-sm leading-relaxed"
                    : "bg-graphite-light border border-crystal text-silk/85 self-start rounded-tl-sm",
                )}
              >
                {msg.role === "user"
                  ? <p className="whitespace-pre-wrap">{msg.content}</p>
                  : <MarkdownMessage content={msg.content || "…"} />
                }
                {msg.role === "streaming" && (
                  <span className="inline-block w-0.5 h-4 bg-electric ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-crystal shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder={`Parler à ${agent.name}…`}
                disabled={isStreaming}
                className="flex-1 bg-graphite-light border border-crystal rounded-xl px-3 py-2.5 text-sm text-silk placeholder-silk/25 focus:outline-none focus:border-electric/50 transition-colors disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                className="w-10 h-10 rounded-xl bg-electric/15 border border-electric/30 text-electric flex items-center justify-center hover:bg-electric/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Store global pour ouvrir le chat depuis n'importe où
interface AgentChatState {
  openAgent: Agent | null;
  openChat: (agent: Agent) => void;
  closeChat: () => void;
}

export const useAgentChat = create<AgentChatState>()((set) => ({
  openAgent: null,
  openChat: (agent) => set({ openAgent: agent }),
  closeChat: () => set({ openAgent: null }),
}));
