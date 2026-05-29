import { useState } from "react";
import { Copy, FileText, Code2, Check } from "lucide-react";
import { useChainStore } from "@/store/chainStore";
import { useAgentStore } from "@/store/agentStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { formatCost, formatTokens } from "@/lib/utils";

export function DeliverablePanel() {
  const { run } = useChainStore();
  const { getAgent } = useAgentStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const completedMessages = run.messages.filter((m) => m.role === "assistant");

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (completedMessages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <div className="w-10 h-10 rounded-2xl bg-graphite-light border border-crystal flex items-center justify-center">
          <FileText size={16} className="text-silk/25" />
        </div>
        <div>
          <p className="text-sm font-medium text-silk/40">Pas encore de livrables</p>
          <p className="text-xs text-silk/20 mt-0.5">Les outputs de la chaîne apparaîtront ici</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary */}
      {(run.totalTokens > 0 || run.status === "completed") && (
        <div className="px-3 py-2 border-b border-crystal/50 flex items-center justify-between">
          <div className="flex gap-3">
            <span className="text-[11px] text-silk/40">
              {formatTokens(run.totalTokens)} tokens
            </span>
            <span className="text-[11px] text-silk/40">{formatCost(run.totalCost)}</span>
          </div>
          {run.status === "completed" && (
            <Badge variant="success" dot>Terminé</Badge>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {completedMessages.map((msg) => {
          const agent = msg.agentId ? getAgent(msg.agentId) : null;
          return (
            <div
              key={msg.id}
              className="bg-graphite-light border border-crystal rounded-xl overflow-hidden"
            >
              {agent && (
                <div className="flex items-center justify-between px-3 py-2 border-b border-crystal/50">
                  <div className="flex items-center gap-2">
                    <AgentAvatar colors={agent.colors} name={agent.name} size={20} />
                    <span className="text-xs font-medium text-silk/70">{agent.name}</span>
                    <span className="text-[10px] text-silk/30">{agent.role}</span>
                  </div>
                  <button
                    onClick={() => copyMessage(msg.id, msg.content)}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-silk/30 hover:text-silk hover:bg-crystal transition-all"
                  >
                    {copiedId === msg.id ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                  </button>
                </div>
              )}
              <div className="px-3 py-2">
                <p className="text-xs text-silk/70 leading-relaxed whitespace-pre-wrap line-clamp-6">
                  {msg.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Export */}
      {run.status === "completed" && completedMessages.length > 0 && (
        <div className="p-3 border-t border-crystal/50 flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1">
            <FileText size={12} /> .docx
          </Button>
          <Button variant="ghost" size="sm" className="flex-1">
            <Code2 size={12} /> .html
          </Button>
        </div>
      )}
    </div>
  );
}
