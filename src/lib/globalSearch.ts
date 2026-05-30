import { invoke } from "@tauri-apps/api/core";
import { useProjectStore } from "@/store/projectStore";

export interface SearchResult {
  deliverableId: string;
  deliverablePath: string;
  projectName: string;
  date: string;
  score: number;
  brief: string;
  excerpt: string;   // extrait avec le terme surligné
  mode: string;
}

// ─── Recherche dans tous les livrables ───────────────────────────────────────
export async function globalSearch(
  query: string,
  options?: {
    minScore?: number;
    dateFrom?: string;
  },
): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const projects = useProjectStore.getState().projects;
  const results: SearchResult[] = [];
  const q = query.toLowerCase();

  for (const project of projects) {
    if (!project.path || project.path === "/") continue;

    try {
      // Lister les livrables du projet
      const metas = await invoke<Array<{
        id: string; path: string; date: string; brief: string;
        mode: string; score: number; duration: number; real_cost: number; agents: string[];
      }>>("list_deliverables", { projectPath: project.path });

      for (const meta of metas) {
        if (options?.minScore && meta.score < options.minScore) continue;
        if (options?.dateFrom && meta.date < options.dateFrom) continue;

        const briefLower = meta.brief.toLowerCase();
        if (briefLower.includes(q)) {
          const idx = briefLower.indexOf(q);
          const start = Math.max(0, idx - 30);
          const end = Math.min(meta.brief.length, idx + query.length + 30);
          const excerpt = (start > 0 ? "…" : "") + meta.brief.slice(start, end) + (end < meta.brief.length ? "…" : "");

          results.push({
            deliverableId: meta.id,
            deliverablePath: meta.path,
            projectName: project.name,
            date: meta.date,
            score: meta.score,
            brief: meta.brief,
            excerpt,
            mode: meta.mode,
          });
        }
      }
    } catch { /* projet sans livrables */ }
  }

  return results.sort((a, b) => b.date.localeCompare(a.date));
}
