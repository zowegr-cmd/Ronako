import { invoke } from "@tauri-apps/api/core";
import { generateId, now } from "@/lib/utils";

export interface SavedBrief {
  id: string;
  name: string;
  brief: string;
  variables: Record<string, string>; // ex: { VILLE: "Lyon", SECTEUR: "dentaire" }
  lastUsed: string;
  useCount: number;
  avgScore: number;
  templateId?: string;
}

// ─── Détection des variables dans un brief ───────────────────────────────────
// Variables entre crochets : "Analyse SEO pour [VILLE] secteur [SECTEUR]"
export function detectVariables(brief: string): string[] {
  const matches = brief.match(/\[([A-Z_À-Ü]+)\]/g) ?? [];
  return matches.map((m) => m.slice(1, -1));
}

export function replaceVariables(brief: string, values: Record<string, string>): string {
  return brief.replace(/\[([A-Z_À-Ü]+)\]/g, (_, key: string) => values[key] ?? `[${key}]`);
}

// ─── Persistance via le keyring projet ────────────────────────────────────────
export async function loadSavedBriefs(): Promise<SavedBrief[]> {
  try {
    const raw = await invoke<string>("load_project_state", { projectId: "__saved_briefs__" });
    return JSON.parse(raw) as SavedBrief[];
  } catch { return []; }
}

export async function saveBriefs(briefs: SavedBrief[]): Promise<void> {
  await invoke("save_project_state", {
    projectId: "__saved_briefs__",
    state: JSON.stringify(briefs, null, 2),
  });
}

export async function saveBrief(brief: string, name?: string): Promise<SavedBrief> {
  const briefs = await loadSavedBriefs();
  const variables = detectVariables(brief);
  const varMap: Record<string, string> = {};
  variables.forEach((v) => { varMap[v] = ""; });

  const entry: SavedBrief = {
    id: generateId(),
    name: name ?? `Brief du ${new Date().toLocaleDateString("fr-FR")}`,
    brief,
    variables: varMap,
    lastUsed: now(),
    useCount: 1,
    avgScore: 0,
  };

  briefs.unshift(entry);
  await saveBriefs(briefs.slice(0, 20)); // max 20 briefs
  return entry;
}

export async function updateBriefStats(id: string, score: number): Promise<void> {
  const briefs = await loadSavedBriefs();
  const idx = briefs.findIndex((b) => b.id === id);
  if (idx === -1) return;
  const b = briefs[idx];
  b.avgScore = b.useCount > 0 ? (b.avgScore * b.useCount + score) / (b.useCount + 1) : score;
  b.useCount += 1;
  b.lastUsed = now();
  await saveBriefs(briefs);
}
