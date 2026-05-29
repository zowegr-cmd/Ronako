import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { useToastStore, type Toast, type ToastType } from "@/store/toastStore";
import { cn } from "@/lib/utils";

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={15} className="text-success shrink-0" />,
  error:   <XCircle     size={15} className="text-danger  shrink-0" />,
  info:    <Info        size={15} className="text-electric shrink-0" />,
  warning: <AlertTriangle size={15} className="text-warning shrink-0" />,
};

const BORDERS: Record<ToastType, string> = {
  success: "border-success/25",
  error:   "border-danger/25",
  info:    "border-electric/25",
  warning: "border-warning/25",
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-2xl",
        "bg-graphite/95 backdrop-blur-xl border shadow-2xl",
        "max-w-sm min-w-[260px]",
        BORDERS[toast.type],
      )}
    >
      {ICONS[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-silk leading-snug">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-silk/50 mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="text-silk/25 hover:text-silk/60 transition-colors shrink-0 mt-0.5"
      >
        <X size={13} />
      </button>
    </motion.div>
  );
}
