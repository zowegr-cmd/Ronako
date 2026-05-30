import { invoke } from "@tauri-apps/api/core";
import { generateId } from "@/lib/utils";

// ─── Génération de code de partage local ─────────────────────────────────────
// Format : RONAKO-XX-XXXX (ex: RONAKO-SF-SEO2)
// Stocké localement dans AppData/Ronako/shared/

export function generateShareCode(name: string): string {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  const shortHash = generateId().slice(0, 4).toUpperCase();
  return `RONAKO-${initials || "XX"}-${shortHash}`;
}

interface SharedEntry {
  code: string;
  name: string;
  type: "agent" | "team" | "pack";
  createdAt: string;
  filePath: string;
}

async function loadShared(): Promise<SharedEntry[]> {
  try {
    const raw = await invoke<string>("load_project_state", { projectId: "__shared_codes__" });
    return JSON.parse(raw) as SharedEntry[];
  } catch { return []; }
}

async function saveShared(entries: SharedEntry[]): Promise<void> {
  await invoke("save_project_state", {
    projectId: "__shared_codes__",
    state: JSON.stringify(entries, null, 2),
  });
}

export async function registerShareCode(
  code: string,
  name: string,
  type: SharedEntry["type"],
  filePath: string,
): Promise<void> {
  const entries = await loadShared();
  entries.unshift({ code, name, type, createdAt: new Date().toISOString(), filePath });
  await saveShared(entries.slice(0, 50));
}

export async function resolveShareCode(code: string): Promise<SharedEntry | null> {
  const entries = await loadShared();
  return entries.find((e) => e.code === code) ?? null;
}

export async function listSharedCodes(): Promise<SharedEntry[]> {
  return loadShared();
}
