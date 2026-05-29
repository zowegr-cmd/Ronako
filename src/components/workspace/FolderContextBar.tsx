import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen, Folder, RefreshCw, BarChart2,
  AlertTriangle, X, FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { FolderSummary } from "@/types";
import { cn } from "@/lib/utils";

interface FolderContextBarProps {
  path: string | null;
  summary: FolderSummary | null;
  loading: boolean;
  onPick: () => void;
  onRefresh: () => void;
  onAnalyze: () => void;
  onUnlink: () => void;
}

export function FolderContextBar({
  path,
  summary,
  loading,
  onPick,
  onRefresh,
  onAnalyze,
  onUnlink,
}: FolderContextBarProps) {
  const folderName = path?.split(/[\\/]/).pop() ?? path;

  if (!path || path === "/") {
    return (
      <div className="flex items-center px-4 py-1.5 border-b border-crystal/30 bg-graphite/30">
        <button
          onClick={onPick}
          className="flex items-center gap-1.5 text-[11px] text-silk/30 hover:text-electric/70 transition-colors group"
        >
          <FolderOpen size={12} className="group-hover:text-electric/70" />
          <span>Lier un dossier pour donner accès aux fichiers aux agents</span>
          <span className="text-electric/50 font-medium">+ Choisir</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 border-b border-crystal/30 bg-graphite/30 shrink-0">
      {/* Folder indicator */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Folder size={12} className="text-electric/60 shrink-0" />
        <span className="text-[11px] text-silk/50 truncate font-mono">{folderName}</span>

        {loading ? (
          <Badge variant="ghost" className="text-[10px]">
            <RefreshCw size={9} className="animate-spin" /> Lecture…
          </Badge>
        ) : summary ? (
          <>
            <Badge variant="electric" className="text-[10px]">
              <FileCode size={9} /> {summary.total_files} fichiers
            </Badge>
            <span className="text-[10px] text-silk/25">
              {summary.total_size_kb.toFixed(0)} KB
            </span>
            {summary.truncated && (
              <Badge variant="warning" className="text-[10px]">
                <AlertTriangle size={9} /> Partiel
              </Badge>
            )}
          </>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Relire les fichiers"
          className="w-6 h-6 rounded-lg flex items-center justify-center text-silk/25 hover:text-silk/60 hover:bg-crystal transition-all disabled:opacity-30"
        >
          <RefreshCw size={11} className={cn(loading && "animate-spin")} />
        </button>

        {summary && (
          <Button
            variant="glass"
            size="sm"
            onClick={onAnalyze}
            disabled={loading}
            className="h-6 text-[11px] px-2"
            title="Lancer une analyse IA du projet"
          >
            <BarChart2 size={11} /> Analyser
          </Button>
        )}

        <button
          onClick={onUnlink}
          title="Délier le dossier"
          className="w-6 h-6 rounded-lg flex items-center justify-center text-silk/20 hover:text-danger/60 hover:bg-danger/10 transition-all"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
}
