import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              "fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
            )}
          >
            <div
              className={cn(
                "w-full pointer-events-auto",
                "bg-graphite border border-crystal rounded-2xl shadow-2xl",
                sizes[size],
              )}
            >
              {title && (
                <div className="flex items-center justify-between px-5 py-4 border-b border-crystal">
                  <h2 className="text-sm font-semibold text-silk">{title}</h2>
                  <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-silk/40 hover:text-silk hover:bg-crystal transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className="p-5">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
