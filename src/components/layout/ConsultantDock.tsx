import { useState, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Wand2, Globe, Lightbulb, ChevronRight } from "lucide-react";
import { cn, generateId } from "@/lib/utils";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { useAgentStore } from "@/store/agentStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useAnthropicStream } from "@/hooks/useAnthropicStream";
import type { Agent } from "@/types";

interface DockMessage {
  id: string;
  role: "user" | "assistant" | "streaming";
  content: string;
}

const CONSULTANT_ICONS: Record<string, ReactNode> = {
  "consultant-ideation": <Lightbulb size={14} />,
  "consultant-prompt": <Wand2 size={14} />,
  "consultant-veille": <Globe size={14} />,
};

export function ConsultantDock() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, DockMessage[]>>({});
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { consultants } = useAgentStore();
  const { apiKey, hasValidApiKey } = useSettingsStore();
  const { stream } = useAnthropicStream();

  const active = consultants.find((c) => c.id === activeId);
  const activeMessages = activeId ? (messages[activeId] ?? []) : [];

  const addMsg = (agentId: string, msg: DockMessage) =>
    setMessages((m) => ({ ...m, [agentId]: [...(m[agentId] ?? []), msg] }));

  const updateLastMsg = (agentId: string, content: string) =>
    setMessages((m) => {
      const list = [...(m[agentId] ?? [])];
      if (list.length > 0) list[list.length - 1] = { ...list[list.length - 1], content };
      return { ...m, [agentId]: list };
    });

  const sendMessage = () => {
    if (!input.trim() || !activeId || !active || isStreaming) return;
    const text = input.trim();
    setInput("");

    const userMsg: DockMessage = { id: generateId(), role: "user", content: text };
    addMsg(activeId, userMsg);

    // Construire le contexte de conversation
    const history = (messages[activeId] ?? [])
      .filter((m) => m.role !== "streaming")
      .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));
    history.push({ role: "user", content: text });

    if (hasValidApiKey()) {
      // Streaming réel
      const streamId = generateId();
      addMsg(activeId, { id: streamId, role: "streaming", content: "" });
      setIsStreaming(true);

      stream({
        apiKey,
        model: active.model,
        systemPrompt: active.systemPrompt,
        userMessage: history.map((m) => `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${m.content}`).join("\n\n"),
        onChunk: (chunk) => updateLastMsg(activeId, (messages[activeId]?.at(-1)?.content ?? "") + chunk),
        onDone: (full) => {
          setMessages((m) => {
            const list = [...(m[activeId] ?? [])];
            if (list.length > 0) {
              list[list.length - 1] = { id: streamId, role: "assistant", content: full };
            }
            return { ...m, [activeId]: list };
          });
          setIsStreaming(false);
        },
        onError: () => {
          updateLastMsg(activeId, "Erreur API. Vérifiez votre clé dans les Paramètres.");
          setIsStreaming(false);
        },
      });
    } else {
      addMsg(activeId, {
        id: generateId(),
        role: "assistant",
        content: "Configurez votre clé API Anthropic dans les Paramètres pour activer les consultants.",
      });
    }
  };

  const handleInjectPrompt = () => {
    if (!activeId) return;
    const lastAssistant = [...(messages[activeId] ?? [])].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;
    // Extraire le contenu entre balises si présentes
    const match = lastAssistant.content.match(/```[\s\S]*?```/g);
    const toInject = match ? match[0].replace(/```\w*\n?/, "").replace(/```$/, "").trim() : lastAssistant.content;
    // Ouvrir le Studio avec le prompt injecté (via un event custom simple)
    window.dispatchEvent(new CustomEvent("ronako:inject-prompt", { detail: toInject }));
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="dock-btn"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-2xl bg-gradient-to-br from-electric to-mystic flex items-center justify-center shadow-glow-electric cursor-pointer hover:scale-110 transition-transform duration-200"
          >
            <MessageSquare size={18} className="text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="dock-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="dock-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-80 flex flex-col bg-graphite/95 backdrop-blur-xl border-l border-crystal"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-crystal shrink-0">
                <div>
                  <p className="text-sm font-semibold text-silk">Consultants</p>
                  <p className="text-[11px] text-silk/35">Accès rapide IA</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/30 hover:text-silk hover:bg-crystal transition-all"
                >
                  <X size={14} />
                </button>
              </div>

              {!activeId ? (
                /* Liste consultants */
                <div className="flex-1 p-3 flex flex-col gap-2">
                  {consultants.map((c) => (
                    <ConsultantRow key={c.id} consultant={c} onClick={() => setActiveId(c.id)} />
                  ))}
                </div>
              ) : (
                /* Chat */
                <>
                  <button
                    onClick={() => setActiveId(null)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-silk/40 hover:text-silk/70 border-b border-crystal transition-colors shrink-0"
                  >
                    <ChevronRight size={12} className="rotate-180" />
                    <AgentAvatar colors={active!.colors} name={active!.name} size={22} />
                    <span>{active!.name}</span>
                    <span className="text-silk/25">— {active!.role}</span>
                  </button>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                    {activeMessages.length === 0 && (
                      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-8">
                        <AgentAvatar colors={active!.colors} name={active!.name} size={52} />
                        <p className="text-sm font-medium text-silk">{active!.name}</p>
                        <p className="text-xs text-silk/35 px-4 leading-relaxed">{active!.description}</p>
                      </div>
                    )}
                    {activeMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "rounded-xl px-3 py-2 text-xs leading-relaxed",
                          msg.role === "user"
                            ? "bg-electric/15 text-silk ml-4"
                            : "bg-graphite-light border border-crystal text-silk/80",
                        )}
                      >
                        {msg.content}
                        {msg.role === "streaming" && (
                          <span className="inline-block w-0.5 h-3.5 bg-electric ml-0.5 animate-pulse align-middle" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t border-crystal shrink-0">
                    {activeId === "consultant-prompt" && activeMessages.some((m) => m.role === "assistant") && (
                      <button
                        onClick={handleInjectPrompt}
                        className="w-full mb-2 py-1.5 px-3 rounded-lg text-xs text-mystic border border-mystic/30 bg-mystic/10 hover:bg-mystic/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Wand2 size={11} /> Injecter dans le Studio
                      </button>
                    )}
                    <div className="flex gap-2">
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Votre message…"
                        disabled={isStreaming}
                        className="flex-1 bg-graphite-light border border-crystal rounded-xl px-3 py-2 text-xs text-silk placeholder-silk/25 focus:outline-none focus:border-electric/50 transition-colors disabled:opacity-50"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isStreaming}
                        className="w-8 h-8 rounded-xl bg-electric/15 border border-electric/30 text-electric flex items-center justify-center hover:bg-electric/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ConsultantRow({ consultant, onClick }: { consultant: Agent; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl border border-crystal hover:border-crystal-light bg-transparent hover:bg-graphite-light transition-all text-left group"
    >
      <AgentAvatar colors={consultant.colors} name={consultant.name} size={38} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-silk/50">{CONSULTANT_ICONS[consultant.id]}</span>
          <p className="text-sm font-medium text-silk">{consultant.name}</p>
        </div>
        <p className="text-[11px] text-silk/35 truncate">{consultant.description}</p>
      </div>
      <ChevronRight size={14} className="text-silk/20 group-hover:text-silk/50 transition-colors shrink-0" />
    </motion.button>
  );
}
