import { useState, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Wand2, Globe, Lightbulb, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { MarkdownMessage } from "@/components/ui/MarkdownMessage";
import { ActionButton } from "@/components/layout/ActionButton";
import { useAgentStore } from "@/store/agentStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useConversationStore } from "@/store/conversationStore";
import { useAnthropicStream } from "@/hooks/useAnthropicStream";
import { buildConsultantContext } from "@/lib/consultantContext";
import type { Agent } from "@/types";

const CONSULTANT_ICONS: Record<string, ReactNode> = {
  "consultant-ideation": <Lightbulb size={14} />,
  "consultant-prompt":   <Wand2 size={14} />,
  "consultant-veille":   <Globe size={14} />,
  "consultant-nova":     <span className="text-[13px]">✦</span>,
};

export function ConsultantDock() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { consultants } = useAgentStore();
  const { apiKey, hasValidApiKey } = useSettingsStore();
  const { addMessage, updateLastMessage, finalizeStreaming, clearConversation, getMessages } =
    useConversationStore();
  const { stream } = useAnthropicStream();

  const active = consultants.find((c) => c.id === activeId);
  const activeMessages = activeId ? getMessages(activeId) : [];

  const sendMessage = () => {
    if (!input.trim() || !activeId || !active || isStreaming) return;
    const text = input.trim();
    setInput("");

    addMessage(activeId, { role: "user", content: text });

    if (!hasValidApiKey()) {
      addMessage(activeId, {
        role: "assistant",
        content: "Configurez votre clé API Anthropic dans les **Paramètres** pour activer les consultants.",
      });
      return;
    }

    // Construire le contexte consultant
    const consultantContext = buildConsultantContext(activeId);

    // Historique pour le prompt
    const history = getMessages(activeId)
      .filter((m) => m.role !== "streaming")
      .slice(-8)
      .map((m) => `${m.role === "user" ? "Utilisateur" : active.name}: ${m.content}`)
      .join("\n\n");
    const userMessage = history
      ? `${history}\n\nUtilisateur: ${text}`
      : text;

    // System prompt enrichi avec le contexte app
    const enrichedSystemPrompt = `${consultantContext}\n\n${active.systemPrompt}`;

    addMessage(activeId, { role: "streaming", content: "" });
    setIsStreaming(true);

    let fullText = "";
    stream({
      apiKey,
      model: active.model,
      systemPrompt: enrichedSystemPrompt,
      userMessage,
      onChunk: (chunk) => {
        fullText += chunk;
        // Afficher le texte brut pendant le streaming (ACTION blocks inclus temporairement)
        updateLastMessage(activeId, fullText);
      },
      onDone: (full) => {
        // Finaliser : parse les ACTION blocks, nettoie le texte
        finalizeStreaming(activeId, full || fullText);
        setIsStreaming(false);
      },
      onError: (err) => {
        finalizeStreaming(activeId, `Erreur API : ${err}`);
        setIsStreaming(false);
      },
    });
  };

  const handleInjectPrompt = () => {
    if (!activeId) return;
    const lastAssistant = [...getMessages(activeId)].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;
    const match = lastAssistant.content.match(/```[\s\S]*?```/g);
    const toInject = match ? match[0].replace(/```\w*\n?/, "").replace(/```$/, "").trim() : lastAssistant.content;
    window.dispatchEvent(new CustomEvent("ronako:inject-prompt", { detail: toInject }));
  };

  return (
    <>
      {/* Bouton flottant */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="dock-btn"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            data-tour="consultant-dock-button"
            onClick={() => { setOpen(true); document.dispatchEvent(new Event("tour-dock-opened")); }}
            className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-2xl bg-gradient-to-br from-electric to-mystic flex items-center justify-center shadow-glow-electric cursor-pointer hover:scale-110 transition-transform duration-200"
          >
            <MessageSquare size={18} className="text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div key="dock-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {open && (
          <motion.div key="dock-panel"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-80 flex flex-col bg-graphite/95 backdrop-blur-xl border-l border-crystal"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-crystal shrink-0">
              <div>
                <p className="text-sm font-semibold text-silk">Consultants</p>
                <p className="text-[11px] text-silk/35">Accès rapide IA</p>
              </div>
              <button onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/30 hover:text-silk hover:bg-crystal transition-all">
                <X size={14} />
              </button>
            </div>

            {!activeId ? (
              /* Liste consultants */
              <div className="flex-1 p-3 flex flex-col gap-2 overflow-y-auto">
                {consultants.map((c) => {
                  const msgCount = getMessages(c.id).filter((m) => m.role !== "streaming").length;
                  return (
                    <ConsultantRow key={c.id} consultant={c} msgCount={msgCount}
                      icon={CONSULTANT_ICONS[c.id]}
                      onClick={() => { setActiveId(c.id); setTimeout(() => inputRef.current?.focus(), 50); }} />
                  );
                })}
              </div>
            ) : (
              /* Chat */
              <>
                {/* Back + header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-crystal shrink-0">
                  <button onClick={() => setActiveId(null)}
                    className="flex items-center gap-2 text-xs text-silk/40 hover:text-silk/70 transition-colors">
                    <ChevronRight size={12} className="rotate-180" />
                    <AgentAvatar colors={active!.colors as [string,string]} name={active!.name} size={22} />
                    <span>{active!.name}</span>
                  </button>
                  <button onClick={() => clearConversation(activeId)}
                    className="text-[10px] text-silk/20 hover:text-danger/60 transition-colors px-1">
                    Effacer
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                  {activeMessages.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-8">
                      <AgentAvatar colors={active!.colors as [string,string]} name={active!.name} size={52} />
                      <p className="text-sm font-medium text-silk">{active!.name}</p>
                      <p className="text-xs text-silk/35 px-4 leading-relaxed">{active!.description}</p>
                    </div>
                  )}
                  {activeMessages.map((msg) => (
                    <div key={msg.id}>
                      <div className={cn(
                        "rounded-xl px-3 py-2",
                        msg.role === "user"
                          ? "bg-electric/15 text-silk ml-4 text-xs leading-relaxed"
                          : "bg-graphite-light border border-crystal text-silk/80",
                      )}>
                        {msg.role === "user"
                          ? msg.content
                          : <MarkdownMessage content={msg.content || "…"} compact />
                        }
                        {msg.role === "streaming" && (
                          <span className="inline-block w-0.5 h-3.5 bg-electric ml-0.5 animate-pulse align-middle" />
                        )}
                      </div>

                      {/* Boutons d'action après la réponse */}
                      {msg.role === "assistant" && msg.actions && msg.actions.length > 0 && (
                        <div className="ml-1 flex flex-col gap-1">
                          {msg.actions.map((action, i) => (
                            <ActionButton key={i} action={action} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-crystal shrink-0">
                  {activeId === "consultant-prompt" && activeMessages.some((m) => m.role === "assistant") && (
                    <button onClick={handleInjectPrompt}
                      className="w-full mb-2 py-1.5 px-3 rounded-lg text-xs text-mystic border border-mystic/30 bg-mystic/10 hover:bg-mystic/20 transition-all flex items-center justify-center gap-1.5">
                      <Wand2 size={11} /> Injecter dans le Studio
                    </button>
                  )}
                  <div className="flex gap-2">
                    <input ref={inputRef} value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Votre message…" disabled={isStreaming}
                      className="flex-1 bg-graphite-light border border-crystal rounded-xl px-3 py-2 text-xs text-silk placeholder-silk/25 focus:outline-none focus:border-electric/50 transition-colors disabled:opacity-50" />
                    <button onClick={sendMessage} disabled={!input.trim() || isStreaming}
                      className="w-8 h-8 rounded-xl bg-electric/15 border border-electric/30 text-electric flex items-center justify-center hover:bg-electric/25 disabled:opacity-30 transition-all">
                      <Send size={12} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ConsultantRow({ consultant, msgCount, icon, onClick }: {
  consultant: Agent; msgCount: number; icon: ReactNode; onClick: () => void;
}) {
  return (
    <motion.button whileHover={{ x: 4 }} onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl border border-crystal hover:border-crystal-light bg-transparent hover:bg-graphite-light transition-all text-left group">
      <AgentAvatar colors={consultant.colors as [string,string]} name={consultant.name} size={38} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-silk/50">{icon}</span>
          <p className="text-sm font-medium text-silk">{consultant.name}</p>
          {msgCount > 0 && (
            <span className="text-[10px] text-silk/30 bg-crystal px-1.5 py-0.5 rounded-full">{msgCount}</span>
          )}
        </div>
        <p className="text-[11px] text-silk/35 truncate">{consultant.description}</p>
      </div>
      <ChevronRight size={14} className="text-silk/20 group-hover:text-silk/50 transition-colors shrink-0" />
    </motion.button>
  );
}
