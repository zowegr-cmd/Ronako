import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { writeTextFile, mkdir } from "@tauri-apps/plugin-fs";
import { useProjectStore } from "@/store/projectStore";
import { useChainStore } from "@/store/chainStore";
import { useAgentStore } from "@/store/agentStore";
import { now } from "@/lib/utils";

export interface ProjectState {
  date: string;
  resume: string;
  decisions: string[];
  fichiers_modifies: string[];
  prochaines_etapes: string[];
  agents_utilises: string[];
  cout_session: number;
}

export function useProjectMemory() {
  const { getActiveProject } = useProjectStore();
  const { run } = useChainStore();
  const { getAgent } = useAgentStore();

  // ── Sauvegarder l'état après une chaîne complète ─────────────────
  const saveState = useCallback(async (customState?: Partial<ProjectState>) => {
    const project = getActiveProject();
    if (!project) return;

    // Construire l'état depuis le dernier run
    const agentsUsed = [...new Set(
      run.messages.filter((m) => m.agentId).map((m) => getAgent(m.agentId!)?.name ?? m.agentId!)
    )];

    // Extraire le résumé depuis le dernier message de Sam ou le dernier message
    const samMsg = [...run.messages].reverse().find((m) => m.agentId === "sam");
    const lastMsg = run.messages[run.messages.length - 1];
    const resume = samMsg?.content?.slice(0, 600) ?? lastMsg?.content?.slice(0, 600) ?? "Aucun résumé disponible.";

    const state: ProjectState = {
      date: now(),
      resume,
      decisions: [],
      fichiers_modifies: [],
      prochaines_etapes: [],
      agents_utilises: agentsUsed,
      cout_session: run.totalCost,
      ...customState,
    };

    const stateJson = JSON.stringify(state, null, 2);

    // 1. Sauvegarder dans l'app data dir Tauri (toujours accessible)
    try {
      await invoke("save_project_state", { projectId: project.id, state: stateJson });
    } catch { /* non bloquant */ }

    // 2. Écrire aussi dans le dossier du projet si lié (.ronako/state.json)
    if (project.path && project.path !== "/") {
      try {
        await mkdir(`${project.path}/.ronako`, { recursive: true });
        await writeTextFile(`${project.path}/.ronako/state.json`, stateJson);
      } catch { /* non bloquant — dossier peut ne pas être accessible */ }
    }
  }, [getActiveProject, run, getAgent]);

  // ── Charger l'état précédent ─────────────────────────────────────
  const loadState = useCallback(async (): Promise<ProjectState | null> => {
    const project = getActiveProject();
    if (!project) return null;

    // Essayer d'abord le dossier projet
    if (project.path && project.path !== "/") {
      try {
        const content = await invoke<string>("read_journal_file", {
          path: `${project.path}/.ronako/state.json`,
        });
        return JSON.parse(content) as ProjectState;
      } catch { /* pas trouvé dans le dossier projet */ }
    }

    // Fallback app data dir
    try {
      const content = await invoke<string>("load_project_state", { projectId: project.id });
      return JSON.parse(content) as ProjectState;
    } catch {
      return null;
    }
  }, [getActiveProject]);

  // ── Formater un message de contexte mémoire pour Marcus ─────────
  const buildMemoryContext = useCallback((state: ProjectState): string => {
    const date = new Date(state.date).toLocaleDateString("fr-FR", { dateStyle: "long" });
    return [
      `📋 **Contexte de la session précédente** (${date}) :`,
      ``,
      state.resume,
      ``,
      state.prochaines_etapes.length > 0
        ? `**Prochaines étapes prévues :**\n${state.prochaines_etapes.map((e) => `• ${e}`).join("\n")}`
        : "",
    ].filter(Boolean).join("\n");
  }, []);

  return { saveState, loadState, buildMemoryContext };
}
