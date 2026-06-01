import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bookmark, Pin, X, Zap } from "lucide-react";
import type { Message, Agent } from "@/types";
import { useSettingsStore } from "@/store/settingsStore";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { MarkdownMessage } from "@/components/ui/MarkdownMessage";
import { useAgentStore } from "@/store/agentStore";
import { useAgentChatStore } from "@/store/agentChatStore";
import { loadSavedBriefs, saveBrief, type SavedBrief } from "@/lib/savedBriefs";
import { cn, formatCost, formatTokens, relativeTime } from "@/lib/utils";

interface OrchestratorChatProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  hasFolder?: boolean;
  hasLastDeliverable?: boolean;
}

// Chips contextuels selon l'état du projet
function getContextChips(hasFolder: boolean, hasDeliverable: boolean): Array<{ label: string; text: string; icon: string }> {
  const chips: Array<{ label: string; text: string; icon: string }> = [];
  if (hasFolder) {
    chips.push({ icon: "🔍", label: "Analyser le dossier", text: "Analyse le dossier connecté et dis-moi ce que tu vois comme opportunités d'amélioration." });
    chips.push({ icon: "⚡", label: "Optimiser les perfs", text: "Identifie les optimisations de performance prioritaires dans le code." });
    chips.push({ icon: "🐛", label: "Corriger un bug", text: "Aide-moi à identifier et corriger le bug le plus critique." });
  } else {
    chips.push({ icon: "✨", label: "Créer quelque chose", text: "Je veux créer " });
    chips.push({ icon: "📋", label: "Établir un plan", text: "Établis un plan complet pour " });
    chips.push({ icon: "💡", label: "Brainstormer", text: "Brainstorme des idées pour " });
  }
  if (hasDeliverable) {
    chips.push({ icon: "🔄", label: "Améliorer le livrable", text: "Améliore le dernier livrable en te concentrant sur les points faibles identifiés par Ryo." });
  }
  return chips;
}

export function OrchestratorChat({ onSend, disabled = false, placeholder, hasFolder = false, hasLastDeliverable = false }: OrchestratorChatProps) {
  const [input, setInput] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [savedBriefs, setSavedBriefs] = useState<SavedBrief[]>([]);
  const { activeAgentId, streamingText, streamingAgentId, getMessages } = useAgentChatStore();
  const messages = getMessages(activeAgentId);
  const { getAgent } = useAgentStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const isStreaming = streamingAgentId !== null;
  const isDisabled = disabled || isStreaming;
  const chips = getContextChips(hasFolder, hasLastDeliverable);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (showSaved) {
      loadSavedBriefs().then(setSavedBriefs);
    }
  }, [showSaved]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isDisabled) return;
    onSend(input.trim());
    setInput("");
  }, [input, isDisabled, onSend]);

  const handleChipClick = (text: string) => {
    if (text.endsWith(" ")) {
      setInput(text); // chip qui demande une complétion
    } else {
      onSend(text); // envoi direct
    }
  };

  const handleLoadBrief = (brief: SavedBrief) => {
    setInput(brief.brief);
    setShowSaved(false);
  };

  const handleSaveBrief = async () => {
    if (!input.trim()) return;
    await saveBrief(input.trim());
  };

  // Raccourci Cmd+Enter
  useEffect(() => {
    const handler = () => handleSend();
    document.addEventListener("marcus-send", handler);
    return () => document.removeEventListener("marcus-send", handler);
  }, [handleSend]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const agent = msg.agentId ? getAgent(msg.agentId) : undefined;
            return (
              <ChatMessage key={msg.id} message={msg} agent={agent} />
            );
          })}
        </AnimatePresence>

        {/* Message en streaming */}
        {isStreaming && streamingAgentId && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 justify-start">
            {(() => { const a = getAgent(streamingAgentId); return a ? <AgentAvatar colors={a.colors as [string,string]} name={a.name} size={26} /> : null; })()}
            <div className="max-w-[80%] flex flex-col gap-0.5">
              {(() => { const a = getAgent(streamingAgentId); return a ? <span className="text-[10px] text-silk/35 px-1">{a.name}</span> : null; })()}
              <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-graphite border border-electric/20 text-silk/85">
                <MarkdownMessage content={streamingText || "…"} />
                <span className="inline-block w-0.5 h-3.5 bg-electric ml-0.5 animate-pulse align-middle" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Typing indicator */}
        {isStreaming && !streamingAgentId && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
            <div className="flex gap-1 px-3 py-2 bg-graphite border border-crystal rounded-xl rounded-tl-sm">
              {[0,1,2].map(i => (
                <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-silk/40"
                  animate={{ y: [0,-4,0], opacity: [0.4,1,0.4] }}
                  transition={{ duration: 0.8, delay: i*0.15, repeat: Infinity }} />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Chips contextuels (visibles si textarea vide) */}
      <AnimatePresence>
        {!input && !isStreaming && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="px-3 pb-1 flex gap-1.5 flex-wrap overflow-hidden">
            {chips.slice(0, 4).map((chip) => (
              <button key={chip.label} onClick={() => handleChipClick(chip.text)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-crystal/50 text-[11px] text-silk/40 hover:text-silk/70 hover:border-crystal transition-all bg-graphite/50">
                <span>{chip.icon}</span> {chip.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel briefs sauvegardés */}
      <AnimatePresence>
        {showSaved && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="mx-3 mb-2 bg-graphite border border-crystal rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-2 border-b border-crystal">
              <p className="text-xs font-medium text-silk/60">Briefs sauvegardés</p>
              <button onClick={() => setShowSaved(false)} className="text-silk/30 hover:text-silk/70"><X size={12}/></button>
            </div>
            {savedBriefs.length === 0
              ? <p className="text-[11px] text-silk/30 px-3 py-3">Aucun brief sauvegardé</p>
              : savedBriefs.map((b) => (
                <button key={b.id} onClick={() => handleLoadBrief(b)}
                  className="w-full text-left px-3 py-2 hover:bg-graphite-light transition-all border-b border-crystal/30 last:border-0">
                  <p className="text-xs text-silk/70 truncate">{b.name}</p>
                  <p className="text-[10px] text-silk/35 truncate">{b.brief.slice(0, 60)}…</p>
                </button>
              ))
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-3 pb-3 pt-1 border-t border-crystal/50 shrink-0">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              data-tour="textarea-brief"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
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
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={handleSend} disabled={!input.trim() || isDisabled}
              className="w-9 h-9 rounded-xl bg-electric/15 border border-electric/30 text-electric flex items-center justify-center hover:bg-electric/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <Send size={14} />
            </button>
            <button onClick={() => { setShowSaved(!showSaved); }}
              title="Briefs sauvegardés"
              className={cn("w-9 h-7 rounded-xl flex items-center justify-center transition-all text-[11px]",
                showSaved ? "bg-mystic/15 border border-mystic/30 text-mystic" : "border border-crystal text-silk/30 hover:text-silk/60")}>
              <Bookmark size={12} />
            </button>
          </div>
        </div>
        {input.trim() && (
          <button onClick={handleSaveBrief} className="mt-1 text-[10px] text-silk/25 hover:text-electric/60 flex items-center gap-1 transition-colors">
            <Pin size={9} /> Sauvegarder ce brief
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Message individuel ───────────────────────────────────────────────────────
function ChatMessage({ message, agent }: { message: Message; agent: Agent | undefined }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const { incrementIgnoredSuggestion } = useSettingsStore();

  if (isSystem) {
    // Détection message suggestion (format ⚡SUGGESTION|action|cost|label|message)
    if (message.content.startsWith("⚡SUGGESTION|")) {
      const [, action, cost, label, ...msgParts] = message.content.split("|");
      const msg = msgParts.join("|");
      return (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="mx-2 my-1 bg-electric/5 border border-electric/20 rounded-xl px-3 py-2">
          <div className="flex items-start gap-2">
            <Zap size={12} className="text-electric shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-silk/70 leading-relaxed">{msg}</p>
              {cost && <p className="text-[10px] text-silk/30 mt-0.5">Impact : {cost}</p>}
            </div>
          </div>
          <div className="flex gap-2 mt-2 justify-end">
            <button
              onClick={() => { incrementIgnoredSuggestion(action); }}
              className="text-[10px] text-silk/25 hover:text-silk/50 transition-colors">
              Ignorer
            </button>
            <button
              onClick={() => {
                if (action.startsWith("open_pack_manager")) document.dispatchEvent(new CustomEvent("navigate-packs"));
                else if (action === "open_pack_manager_image") document.dispatchEvent(new CustomEvent("navigate-packs"));
              }}
              className="text-[10px] font-medium text-electric/80 hover:text-electric border border-electric/30 rounded-lg px-2 py-0.5 transition-all">
              {label}
            </button>
          </div>
        </motion.div>
      );
    }
    return (
      <div className="flex justify-center py-0.5">
        <span className="text-[10px] text-silk/25 bg-graphite-light border border-crystal/30 px-2 py-0.5 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className={cn("flex gap-2.5", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && agent && <AgentAvatar colors={agent.colors as [string,string]} name={agent.name} size={26} />}
      <div className={cn("max-w-[80%] flex flex-col gap-0.5", isUser && "items-end")}>
        {!isUser && agent && <span className="text-[10px] text-silk/35 px-1">{agent.name}</span>}
        <div className={cn("px-3 py-2 rounded-2xl",
          isUser ? "bg-electric/20 text-silk rounded-tr-sm text-sm leading-relaxed"
                 : "bg-graphite border border-crystal text-silk/85 rounded-tl-sm")}>
          {isUser
            ? <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            : <MarkdownMessage content={message.content} />
          }
        </div>
        <div className="flex gap-2 px-1">
          <span className="text-[10px] text-silk/20">{relativeTime(message.timestamp)}</span>
          {message.tokens !== undefined && <span className="text-[10px] text-silk/15">{formatTokens(message.tokens)} tok</span>}
          {message.cost !== undefined && <span className="text-[10px] text-silk/15">{formatCost(message.cost)}</span>}
        </div>
      </div>
    </motion.div>
  );
}
