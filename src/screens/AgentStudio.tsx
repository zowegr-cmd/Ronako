import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Sparkles } from "lucide-react";
import { AgentCard } from "@/components/agents/AgentCard";
import { AgentForm } from "@/components/agents/AgentForm";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAgentStore } from "@/store/agentStore";
import type { Agent } from "@/types";
import { cn } from "@/lib/utils";

export function AgentStudio() {
  const { agents, addAgent, updateAgent, deleteAgent } = useAgentStore();
  const [editTarget, setEditTarget] = useState<Agent | "new" | null>(null);
  const [search, setSearch] = useState("");

  const filtered = agents.filter(
    (a) =>
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSave = (data: Omit<Agent, "id">) => {
    if (editTarget === "new") {
      addAgent(data);
    } else if (editTarget) {
      updateAgent(editTarget.id, data);
    }
    setEditTarget(null);
  };

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  };
  const cardItem = {
    hidden: { opacity: 0, y: 12, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } },
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-silk">Studio des Agents</h1>
          <p className="text-xs text-silk/35 mt-0.5">
            {agents.length} agents configurés
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-silk/25 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="bg-graphite border border-crystal rounded-xl pl-8 pr-3 py-2 text-xs text-silk placeholder-silk/25 focus:outline-none focus:border-electric/50 transition-colors w-44"
            />
          </div>
          <Button variant="primary" size="sm" onClick={() => setEditTarget("new")}>
            <Plus size={14} />
            Nouvel agent
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-3 gap-3"
        >
          <AnimatePresence>
            {filtered.map((agent) => (
              <motion.div key={agent.id} variants={cardItem} layout>
                <AgentCard
                  agent={agent}
                  onEdit={(a) => setEditTarget(a)}
                  onDelete={deleteAgent}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add card */}
          <motion.button
            variants={cardItem}
            onClick={() => setEditTarget("new")}
            className={cn(
              "flex flex-col items-center justify-center gap-2 h-[148px]",
              "bg-transparent border-2 border-dashed border-crystal hover:border-mystic/40",
              "rounded-2xl text-silk/20 hover:text-mystic/60",
              "transition-all duration-200 cursor-pointer group",
            )}
            whileHover={{ scale: 1.01 }}
          >
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-current flex items-center justify-center group-hover:shadow-[0_0_12px_rgba(162,89,255,0.3)]">
              <Plus size={14} />
            </div>
            <span className="text-xs font-medium">Créer un agent</span>
          </motion.button>
        </motion.div>

        {filtered.length === 0 && search && (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
            <Sparkles size={24} className="text-silk/15" />
            <p className="text-sm text-silk/30">Aucun agent trouvé pour "{search}"</p>
          </div>
        )}
      </div>

      {/* Modal form */}
      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={editTarget === "new" || !editTarget ? "Créer un agent" : `Modifier ${editTarget.name}`}
        size="lg"
      >
        <AgentForm
          initial={editTarget !== "new" && editTarget ? editTarget : undefined}
          onSave={handleSave}
          onCancel={() => setEditTarget(null)}
        />
      </Modal>
    </div>
  );
}
