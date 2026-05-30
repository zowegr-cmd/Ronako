import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project } from "@/types";
import { generateId, now } from "@/lib/utils";
import { useChainStore } from "@/store/chainStore";

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;
  lastOpenedProjectId: string | null; // survit à closeProject() pour détecter vrai changement
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
      lastOpenedProjectId: null,

      createProject: (name, path, teamId = "alpha") => {
        const project: Project = {
          id: generateId(), name, path, teamId,
          createdAt: now(), updatedAt: now(), lastOpened: now(),
        };
        // Nouveau projet → vider le workspace de l'ancien
        useChainStore.getState().clearWorkspace();
        useChainStore.getState().resetRun();
        set((s) => ({
          projects: [project, ...s.projects],
          activeProjectId: project.id,
          lastOpenedProjectId: project.id,
        }));
        return project;
      },

      openProject: (id) => {
        const { lastOpenedProjectId } = get();
        // On vide UNIQUEMENT si on ouvre un projet DIFFÉRENT du dernier
        // (lastOpenedProjectId != null garantit qu'on n'est pas au 1er lancement)
        if (lastOpenedProjectId !== null && lastOpenedProjectId !== id) {
          useChainStore.getState().clearWorkspace();
          useChainStore.getState().resetRun();
        }
        set((s) => ({
          activeProjectId: id,
          lastOpenedProjectId: id,
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
      // Note: on NE reset PAS lastOpenedProjectId ici — c'est intentionnel.
      // Quand l'utilisateur revient au même projet depuis le Launcher, on préserve la conversation.
    }),
    { name: "ronako-projects-v1" }
  )
);
