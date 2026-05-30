import { invoke } from "@tauri-apps/api/core";

// ─── Mémoire utilisateur globale ─────────────────────────────────────────────
// Stockée dans AppData/Ronako/user_memory.json — PAS dans un projet.
// Mise à jour automatiquement après chaque chaîne.

export interface UserMemory {
  preferences: {
    langue: string;
    ton_favori: string;
    mode_prefere: string;
    secteurs_frequents: string[];
    stack_favorite: string;
  };
  patterns: {
    agents_souvent_retires: string[];
    agents_souvent_ajoutes: string[];
    score_moyen: number;
    cout_moyen_cents: number;
    chaines_total: number;
  };
  apprentissages: string[];
  last_updated: string;
}

const DEFAULT_MEMORY: UserMemory = {
  preferences: {
    langue: "fr",
    ton_favori: "professionnel",
    mode_prefere: "project",
    secteurs_frequents: [],
    stack_favorite: "",
  },
  patterns: {
    agents_souvent_retires: [],
    agents_souvent_ajoutes: [],
    score_moyen: 0,
    cout_moyen_cents: 0,
    chaines_total: 0,
  },
  apprentissages: [],
  last_updated: new Date().toISOString(),
};

export async function loadUserMemory(): Promise<UserMemory> {
  try {
    const raw = await invoke<string>("load_project_state", { projectId: "__user_memory__" });
    return { ...DEFAULT_MEMORY, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_MEMORY };
  }
}

export async function saveUserMemory(memory: UserMemory): Promise<void> {
  await invoke("save_project_state", {
    projectId: "__user_memory__",
    state: JSON.stringify({ ...memory, last_updated: new Date().toISOString() }, null, 2),
  });
}

// ─── Mettre à jour après chaque chaîne ───────────────────────────────────────
export async function updateMemoryAfterChain(params: {
  mode: string;
  score: number;
  costCents: number;
  agentsUsed: string[];
  agentsRemoved?: string[];
  agentsAdded?: string[];
  sector?: string;
}): Promise<void> {
  try {
    const memory = await loadUserMemory();
    const p = memory.patterns;
    const total = p.chaines_total + 1;

    // Moyenne glissante score et coût
    p.score_moyen = ((p.score_moyen * p.chaines_total) + params.score) / total;
    p.cout_moyen_cents = ((p.cout_moyen_cents * p.chaines_total) + params.costCents) / total;
    p.chaines_total = total;

    // Mode préféré
    if (total > 3) memory.preferences.mode_prefere = params.mode;

    // Agents fréquemment retirés / ajoutés
    if (params.agentsRemoved?.length) {
      params.agentsRemoved.forEach((id) => {
        if (!p.agents_souvent_retires.includes(id)) p.agents_souvent_retires.push(id);
      });
      p.agents_souvent_retires = p.agents_souvent_retires.slice(-5);
    }
    if (params.agentsAdded?.length) {
      params.agentsAdded.forEach((id) => {
        if (!p.agents_souvent_ajoutes.includes(id)) p.agents_souvent_ajoutes.push(id);
      });
      p.agents_souvent_ajoutes = p.agents_souvent_ajoutes.slice(-5);
    }

    // Secteurs fréquents
    if (params.sector && !memory.preferences.secteurs_frequents.includes(params.sector)) {
      memory.preferences.secteurs_frequents.push(params.sector);
      memory.preferences.secteurs_frequents = memory.preferences.secteurs_frequents.slice(-5);
    }

    await saveUserMemory(memory);
  } catch { /* silencieux */ }
}

// ─── Construire le contexte mémoire pour Marcus ──────────────────────────────
export function buildMemoryPrompt(memory: UserMemory): string {
  const p = memory.preferences;
  const pat = memory.patterns;
  if (pat.chaines_total < 2) return "";

  const lines: string[] = ["[CONTEXTE UTILISATEUR]"];
  if (p.secteurs_frequents.length) lines.push(`Secteurs : ${p.secteurs_frequents.join(", ")}`);
  if (p.mode_prefere !== "project") lines.push(`Mode préféré : ${p.mode_prefere}`);
  if (pat.score_moyen > 0) lines.push(`Score moyen : ${pat.score_moyen.toFixed(1)}/10`);
  if (memory.apprentissages.length) lines.push(memory.apprentissages.slice(-2).join(" · "));
  lines.push("[/CONTEXTE]");
  return lines.join("\n");
}
