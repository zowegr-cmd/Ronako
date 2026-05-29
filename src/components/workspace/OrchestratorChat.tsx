import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import type { Message, Agent } from "@/types";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { useAgentStore } from "@/store/agentStore";
import { useChainStore } from "@/store/chainStore";
import { cn, formatCost, formatTokens, relativeTime } from "@/lib/utils";

interface OrchestratorChatProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function OrchestratorChat({ onSend, disabled = false, placeholder }: OrchestratorChatProps) {
  const [input, setInput] = useState("");
  const { workspaceMessages, run, streamingText, streamingAgentId } = useChainStore();
  const { getAgent } = useAgentStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const isRunning = run.status === "running";
  const isDisabled = disabled || isRunning;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [workspaceMessages]);

  const handleSend = () => {
    if (!input.trim() || isDisabled) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {workspaceMessages.map((msg) => {
            const agent = msg.agentId ? getAgent(msg.agentId) : undefined;
            return (
              <ChatMessage key={msg.id} message={msg} agent={agent} />
            );
          })}
        </AnimatePresence>

        {/* Message en streaming temps réel */}
        {isRunning && streamingAgentId && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2.5 justify-start"
          >
            {(() => {
              const agent = getAgent(streamingAgentId);
              return agent ? <AgentAvatar colors={agent.colors} name={agent.name} size={26} /> : null;
            })()}
            <div className="max-w-[80%] flex flex-col gap-0.5">
              {(() => {
                const agent = getAgent(streamingAgentId);
                return agent ? <span className="text-[10px] text-silk/35 px-1">{agent.name}</span> : null;
              })()}
              <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-graphite border border-electric/20 text-sm text-silk/85 leading-relaxed">
                <p className="whitespace-pre-wrap">
                  {streamingText}
                  <span className="inline-block w-0.5 h-4 bg-electric ml-0.5 animate-pulse align-middle" />
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Typing indicator (quand en attente sans streaming encore) */}
        {isRunning && !streamingAgentId && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <div className="flex gap-1 px-3 py-2 bg-graphite border border-crystal rounded-xl rounded-tl-sm">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-silk/40"
                  animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-3 pb-3 pt-2 border-t border-crystal/50">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={placeholder ?? "Votre message… (Entrée pour envoyer)"}
              disabled={isDisabled}
              rows={2}
              className={cn(
                "w-full bg-graphite-light border border-crystal rounded-xl px-3 py-2.5",
                "text-sm text-silk placeholder-silk/25 resize-none",
                "focus:outline-none focus:border-electric/50 transition-colors",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isDisabled}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center",
              "bg-electric/15 border border-electric/30 text-electric",
              "hover:bg-electric/25 disabled:opacity-30 disabled:cursor-not-allowed",
              "transition-all duration-150 shrink-0",
            )}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({
  message,
  agent,
}: {
  message: Message;
  agent: Agent | undefined;
}) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-2.5", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && agent && (
        <AgentAvatar colors={agent.colors} name={agent.name} size={26} />
      )}
      <div className={cn("max-w-[80%] flex flex-col gap-0.5", isUser && "items-end")}>
        {!isUser && agent && (
          <span className="text-[10px] text-silk/35 px-1">{agent.name}</span>
        )}
        <div
          className={cn(
            "px-3 py-2 rounded-2xl text-sm leading-relaxed",
            isUser
              ? "bg-electric/20 text-silk rounded-tr-sm"
              : "bg-graphite border border-crystal text-silk/85 rounded-tl-sm",
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="flex gap-2 px-1">
          <span className="text-[10px] text-silk/20">{relativeTime(message.timestamp)}</span>
          {message.tokens !== undefined && (
            <span className="text-[10px] text-silk/15">{formatTokens(message.tokens)} tok</span>
          )}
          {message.cost !== undefined && (
            <span className="text-[10px] text-silk/15">{formatCost(message.cost)}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
