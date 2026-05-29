import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project } from "@/types";
import { generateId, now } from "@/lib/utils";

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;
  createProject: (name: string, path: string, teamId?: string) => Project;
  openProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getActiveProject: () => Project | undefined;
  closeProject: () => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,

      createProject: (name, path, teamId = "alpha") => {
        const project: Project = {
          id: generateId(),
          name,
          path,
          teamId,
          createdAt: now(),
          updatedAt: now(),
          lastOpened: now(),
        };
        set((s) => ({ projects: [project, ...s.projects], activeProjectId: project.id }));
        return project;
      },

      openProject: (id) => {
        set((s) => ({
          activeProjectId: id,
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, lastOpened: now() } : p
          ),
        }));
      },

      updateProject: (id, updates) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: now() } : p
          ),
        })),

      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
        })),

      getActiveProject: () => {
        const { projects, activeProjectId } = get();
        return projects.find((p) => p.id === activeProjectId);
      },

      closeProject: () => set({ activeProjectId: null }),
    }),
    { name: "ronako-projects-v1" }
  )
);
