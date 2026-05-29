import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useProjectStore } from "@/store/projectStore";
import { useToastStore } from "@/store/toastStore";
import type { FolderSummary } from "@/types";

export function useProjectFolder() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<FolderSummary | null>(null);
  const { getActiveProject, updateProject } = useProjectStore();
  const toast = useToastStore();

  // ── Sélectionner un dossier via le dialog natif OS ────────────────
  const pickFolder = useCallback(async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Lier un dossier au projet",
    });

    if (!selected || typeof selected !== "string") return null;

    const project = getActiveProject();
    if (project) {
      updateProject(project.id, { path: selected });
      toast.success("Dossier lié", selected.split(/[\\/]/).pop() ?? selected);
    }
    return selected;
  }, [getActiveProject, updateProject, toast]);

  // ── Lire le contenu du dossier ────────────────────────────────────
  const readFolder = useCallback(async (path: string): Promise<FolderSummary | null> => {
    setLoading(true);
    try {
      const result = await invoke<FolderSummary>("read_project_folder", { path });
      setSummary(result);
      if (result.truncated) {
        toast.warning(
          "Lecture partielle",
          `Limite de 600KB atteinte. ${result.skipped_files} fichiers ignorés.`
        );
      }
      return result;
    } catch (e) {
      toast.error("Erreur lecture dossier", String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // ── Formater le contexte pour les agents ─────────────────────────
  const buildFolderContext = useCallback((s: FolderSummary): string => {
    const header = [
      `=== CONTEXTE DU PROJET (dossier lié) ===`,
      `Racine : ${s.root}`,
      `Fichiers analysés : ${s.total_files} (${s.total_size_kb.toFixed(1)} KB)`,
      s.truncated ? `⚠️ Lecture partielle — limite 600KB atteinte.` : "",
      ``,
      `Arborescence :`,
      s.tree,
      ``,
      `=== CONTENU DES FICHIERS ===`,
    ].filter(Boolean).join("\n");

    const filesContent = s.files
      .map((f) => `\n--- ${f.path} (${(f.size / 1024).toFixed(1)}KB) ---\n${f.content}`)
      .join("\n");

    return header + filesContent + "\n\n=== FIN CONTEXTE PROJET ===";
  }, []);

  return { loading, summary, pickFolder, readFolder, buildFolderContext };
}
