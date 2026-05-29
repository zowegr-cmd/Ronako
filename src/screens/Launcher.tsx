import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FolderOpen, Clock, ChevronRight, Trash2, Folder } from "lucide-react";
import { TitleBar } from "@/components/layout/TitleBar";
import { Button } from "@/components/ui/Button";
import { AppLogo } from "@/components/ui/AppLogo";
import { Modal } from "@/components/ui/Modal";
import { useProjectStore } from "@/store/projectStore";
import { relativeTime, truncate } from "@/lib/utils";
import type { Project } from "@/types";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export function Launcher() {
  const navigate = useNavigate();
  const { projects, createProject, openProject, deleteProject } = useProjectStore();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPath, setNewPath] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProject(newName.trim(), newPath.trim() || "/");
    setShowNew(false);
    setNewName("");
    setNewPath("");
    navigate("/workspace");
  };

  const handleOpen = (project: Project) => {
    openProject(project.id);
    navigate("/workspace");
  };

  return (
    <div className="h-screen bg-onyx flex flex-col overflow-hidden">
      <TitleBar />
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Background orbs */}
        <Orb color="#007AFF" style={{ top: "-8%", left: "-4%", width: 500, height: 500 }} delay={0} />
        <Orb color="#A259FF" style={{ bottom: "-12%", right: "-6%", width: 600, height: 600 }} delay={3} />
        <Orb color="#007AFF" style={{ top: "30%", right: "20%", width: 300, height: 300 }} delay={6} size="sm" />

        {/* Content */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="relative z-10 w-full max-w-[520px] px-8 flex flex-col gap-10"
        >
          {/* Hero */}
          <motion.div variants={item} className="flex flex-col items-center gap-4 text-center">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              transition={{ type: "spring", stiffness: 300 }}
              style={{ filter: "drop-shadow(0 0 24px rgba(0,122,255,0.35))" }}
            >
              <AppLogo size={72} />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold text-silk tracking-tight">Ronako</h1>
              <p className="text-silk/35 text-xs mt-1 tracking-[0.2em] uppercase">
                Superviseur Multi-Agents IA
              </p>
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div variants={item} className="flex gap-3">
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={() => setShowNew(true)}
            >
              <Plus size={16} />
              Nouveau projet
            </Button>
            <Button
              variant="glass"
              size="lg"
              className="flex-1"
              onClick={() => {
                createProject("Projet Demo", "/chemin/vers/projet");
                navigate("/workspace");
              }}
            >
              <FolderOpen size={16} />
              Demo rapide
            </Button>
          </motion.div>

          {/* Recent projects */}
          {projects.length > 0 && (
            <motion.div variants={item} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-silk/25" />
                <span className="text-[11px] text-silk/25 uppercase tracking-widest">Récents</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <AnimatePresence>
                  {projects.slice(0, 5).map((project) => (
                    <RecentProjectCard
                      key={project.id}
                      project={project}
                      onOpen={() => handleOpen(project)}
                      onDelete={() => deleteProject(project.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* New project modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nouveau projet">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-silk/40 block mb-1.5">Nom du projet</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Mon super projet"
              autoFocus
              className="w-full bg-graphite-light border border-crystal rounded-xl px-3 py-2.5 text-sm text-silk placeholder-silk/25 focus:outline-none focus:border-electric/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-silk/40 block mb-1.5">
              Dossier local <span className="text-silk/20">(optionnel)</span>
            </label>
            <input
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="/Users/moi/projets/mon-projet"
              className="w-full bg-graphite-light border border-crystal rounded-xl px-3 py-2.5 text-xs text-silk/70 font-mono placeholder-silk/20 focus:outline-none focus:border-electric/50 transition-colors"
            />
            <p className="text-[11px] text-silk/25 mt-1">
              Pointe vers le dossier géré par Claude Code dans le terminal.
            </p>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button variant="primary" onClick={handleCreate} disabled={!newName.trim()}>
              Créer le projet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RecentProjectCard({
  project,
  onOpen,
  onDelete,
}: {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-crystal hover:border-crystal-light bg-graphite/50 hover:bg-graphite transition-all duration-200 cursor-pointer"
      onClick={onOpen}
    >
      <div className="w-8 h-8 rounded-lg bg-graphite-light border border-crystal flex items-center justify-center shrink-0">
        <Folder size={14} className="text-silk/35" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-silk truncate">{project.name}</p>
        <p className="text-[10px] text-silk/25 font-mono truncate">{truncate(project.path, 45)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-silk/20">{relativeTime(project.lastOpened)}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-silk/25 hover:text-danger hover:bg-danger/10 transition-all"
        >
          <Trash2 size={11} />
        </button>
        <ChevronRight size={13} className="text-silk/20 group-hover:text-silk/50 transition-colors" />
      </div>
    </motion.div>
  );
}

function Orb({
  color,
  style,
  delay,
  size = "lg",
}: {
  color: string;
  style: CSSProperties;
  delay: number;
  size?: "sm" | "lg";
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        ...style,
        background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
        filter: "blur(40px)",
      }}
      animate={{
        x: [0, 20, -10, 0],
        y: [0, -15, 10, 0],
      }}
      transition={{
        duration: size === "lg" ? 14 : 10,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}
