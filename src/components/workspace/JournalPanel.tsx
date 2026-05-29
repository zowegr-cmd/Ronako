import { motion } from "framer-motion";
import { RefreshCw, BookOpen, FolderOpen, Radio } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface JournalPanelProps {
  journalContent: string | null;
  onRefresh?: () => void;
  watching?: boolean;
}

export function JournalPanel({ journalContent, onRefresh, watching }: JournalPanelProps) {
  if (!journalContent && !onRefresh) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <BookOpen size={20} className="text-silk/20" />
        <p className="text-xs text-silk/30">
          Lie un dossier local à ce projet pour lire le journal de Claude Code.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-crystal/50 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-silk/35 font-mono">journal_dev.md</span>
          {watching && (
            <span className="flex items-center gap-1 text-[10px] text-success/60">
              <Radio size={9} /> live
            </span>
          )}
        </div>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw size={11} /> Actualiser
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!journalContent ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <FolderOpen size={16} className="text-silk/20" />
            <p className="text-xs text-silk/25">
              Aucun fichier journal_dev.md dans ce dossier.<br />
              Claude Code le créera lors de la prochaine session.
            </p>
          </div>
        ) : (
          <motion.pre
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono text-[11px] text-silk/60 leading-relaxed whitespace-pre-wrap break-words"
          >
            {journalContent}
          </motion.pre>
        )}
      </div>
    </div>
  );
}
