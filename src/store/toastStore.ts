import { create } from "zustand";
import { generateId } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

export const useToastStore = create<ToastStore>()((set, get) => ({
  toasts: [],

  push: (toast) => {
    const id = generateId();
    const full: Toast = { id, duration: 4000, ...toast };
    set((s) => ({ toasts: [...s.toasts, full] }));
    setTimeout(() => get().dismiss(id), full.duration);
    return id;
  },

  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  success: (title, message) => get().push({ type: "success", title, message }),
  error:   (title, message) => get().push({ type: "error",   title, message, duration: 6000 }),
  info:    (title, message) => get().push({ type: "info",    title, message }),
  warning: (title, message) => get().push({ type: "warning", title, message }),
}));
