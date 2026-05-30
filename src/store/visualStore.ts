import { create } from "zustand";

export type VisualType = "image" | "video" | "audio";

export interface VisualEntry {
  id: string;
  type: VisualType;
  local_path: string;
  url?: string;
  model: string;
  prompt: string;
  cost_cents: number;
  agentId?: string;
  projectName?: string;
  createdAt: string;
  // Métadonnées audio
  voiceName?: string;
  script?: string;
  // Métadonnées vidéo
  durationSec?: number;
}

interface VisualStore {
  visuals: VisualEntry[];
  isGenerating: boolean;
  generatingType: VisualType | null;

  addVisual: (v: Omit<VisualEntry, "id" | "createdAt">) => void;
  removeVisual: (id: string) => void;
  clearVisuals: () => void;
  setGenerating: (generating: boolean, type?: VisualType | null) => void;

  getByType: (type: VisualType) => VisualEntry[];
  getImages: () => VisualEntry[];
  getVideos: () => VisualEntry[];
  getAudios: () => VisualEntry[];
}

export const useVisualStore = create<VisualStore>()((set, get) => ({
  visuals: [],
  isGenerating: false,
  generatingType: null,

  addVisual: (v) => set((s) => ({
    visuals: [...s.visuals, {
      ...v,
      id: `visual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    }],
  })),

  removeVisual: (id) => set((s) => ({ visuals: s.visuals.filter((v) => v.id !== id) })),

  clearVisuals: () => set({ visuals: [], isGenerating: false, generatingType: null }),

  setGenerating: (generating, type = null) => set({ isGenerating: generating, generatingType: type }),

  getByType: (type) => get().visuals.filter((v) => v.type === type),
  getImages: () => get().visuals.filter((v) => v.type === "image"),
  getVideos: () => get().visuals.filter((v) => v.type === "video"),
  getAudios: () => get().visuals.filter((v) => v.type === "audio"),
}));
