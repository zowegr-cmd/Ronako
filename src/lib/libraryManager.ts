import { invoke } from "@tauri-apps/api/core";
import type { DeliverableEntry, DeliverableData, ChainMode } from "@/types";

interface SaveParams {
  projectPath: string | null;
  projectId: string;
  brief: string;
  dna: string;
  mode: ChainMode;
  agents: string[];
  outputs: Record<string, string>;
  relayOutputs: Record<string, string>;
  finalDeliverable: string;
  score: number;
  realCost: number;
  duration: number;
}

// ─── Sauvegarder un livrable ──────────────────────────────────────────────────
export async function saveDeliverable(params: SaveParams): Promise<string> {
  const now = new Date();
  const folderId = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);

  const meta: Record<string, unknown> = {
    id: folderId,
    path: "", // sera mis à jour après
    date: now.toISOString(),
    brief: params.brief.slice(0, 200),
    mode: params.mode,
    agents: params.agents,
    score: params.score,
    real_cost: params.realCost,
    duration: params.duration,
  };

  const files: Array<[string, string]> = [
    ["meta.json", JSON.stringify(meta, null, 2)],
    ["brief.md", `# Brief\n\n${params.brief}`],
    ["adn.md", `# ADN Projet\n\n${params.dna}`],
    ["livrable_final.md", params.finalDeliverable],
  ];

  // Outputs par agent
  for (const [agentId, content] of Object.entries(params.outputs)) {
    files.push([`outputs/${agentId}.md`, content]);
  }

  // Résumés Relay
  for (const [agentId, summary] of Object.entries(params.relayOutputs)) {
    if (summary) files.push([`relay/${agentId}_relay.md`, summary]);
  }

  const projectPath = params.projectPath && params.projectPath !== "/" ? params.projectPath : "";
  const resultPath = await invoke<string>("save_deliverable", {
    projectPath,
    folderName: folderId,
    files,
  });

  // Mettre à jour meta.json avec le vrai chemin
  meta.path = resultPath;
  await invoke("save_deliverable", {
    projectPath,
    folderName: folderId,
    files: [["meta.json", JSON.stringify(meta, null, 2)]],
  });

  return resultPath;
}

// ─── Lister les livrables ─────────────────────────────────────────────────────
export async function loadLibrary(
  projectPath: string | null,
): Promise<DeliverableEntry[]> {
  const path = projectPath && projectPath !== "/" ? projectPath : "";
  const raw = await invoke<Array<{
    id: string; path: string; date: string; brief: string;
    mode: string; agents: string[]; score: number; real_cost: number; duration: number;
  }>>("list_deliverables", { projectPath: path });

  return raw.map((r) => ({
    id: r.id,
    path: r.path,
    date: r.date,
    brief: r.brief,
    mode: r.mode as ChainMode,
    agents: r.agents,
    score: r.score,
    realCost: r.real_cost,
    duration: r.duration,
  }));
}

// ─── Charger un livrable complet ─────────────────────────────────────────────
export async function loadDeliverable(entry: DeliverableEntry): Promise<DeliverableData> {
  const loadFile = async (name: string) => {
    try {
      return await invoke<string>("load_deliverable_file", {
        deliverablePath: entry.path,
        fileName: name,
      });
    } catch { return ""; }
  };

  const [dna, finalDeliverable] = await Promise.all([
    loadFile("adn.md"),
    loadFile("livrable_final.md"),
  ]);

  // Charger les outputs des agents
  const outputs: Record<string, string> = {};
  for (const agentId of entry.agents) {
    const content = await loadFile(`outputs/${agentId}.md`);
    if (content) outputs[agentId] = content;
  }

  // Extraire les faiblesses Ryo si disponible
  const ryoOutput = outputs["ryo"] ?? "";
  const { weaknesses } = ryoOutput
    ? (await import("@/lib/ryoParser")).parseRyoOutput(ryoOutput)
    : { weaknesses: [] };

  return {
    ...entry,
    dna,
    outputs,
    finalDeliverable,
    ryoWeaknesses: weaknesses,
  };
}

// ─── Supprimer un livrable ────────────────────────────────────────────────────
export async function deleteDeliverable(path: string): Promise<void> {
  await invoke("delete_deliverable", { deliverablePath: path });
}
