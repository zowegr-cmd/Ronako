import { invoke } from "@tauri-apps/api/core";
import { generateId, now } from "@/lib/utils";

export interface WorkSession {
  id: string;
  projectId: string;
  projectName: string;
  startTime: string;
  endTime: string;
  duration: number;     // minutes
  chainsRun: number;
  totalCost: number;    // centimes
  avgScore: number;
}

async function loadSessions(): Promise<WorkSession[]> {
  try {
    const raw = await invoke<string>("load_project_state", { projectId: "__sessions__" });
    return JSON.parse(raw) as WorkSession[];
  } catch { return []; }
}

async function saveSessions(sessions: WorkSession[]): Promise<void> {
  await invoke("save_project_state", {
    projectId: "__sessions__",
    state: JSON.stringify(sessions.slice(0, 100), null, 2), // max 100 sessions
  });
}

let currentSessionId: string | null = null;
let sessionStart: number | null = null;
let sessionChains = 0;
let sessionCost = 0;
let sessionScores: number[] = [];

export function startSession(_projectId: string, _projectName: string): void {
  currentSessionId = generateId();
  sessionStart = Date.now();
  sessionChains = 0;
  sessionCost = 0;
  sessionScores = [];
}

export async function endSession(projectId: string, projectName: string): Promise<void> {
  if (!currentSessionId || !sessionStart) return;
  const duration = Math.round((Date.now() - sessionStart) / 60000);
  if (duration < 1) return; // sessions < 1min ignorées

  const session: WorkSession = {
    id: currentSessionId,
    projectId,
    projectName,
    startTime: new Date(sessionStart).toISOString(),
    endTime: now(),
    duration,
    chainsRun: sessionChains,
    totalCost: sessionCost,
    avgScore: sessionScores.length > 0
      ? Math.round(sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length * 10) / 10
      : 0,
  };

  const sessions = await loadSessions();
  sessions.unshift(session);
  await saveSessions(sessions);
  currentSessionId = null;
}

export function recordChain(cost: number, score: number): void {
  sessionChains++;
  sessionCost += cost;
  if (score > 0) sessionScores.push(score);
}

export async function getRecentSessions(limit = 10): Promise<WorkSession[]> {
  const sessions = await loadSessions();
  return sessions.slice(0, limit);
}

// Générer CSV pour facturation
export function generateBillingCSV(sessions: WorkSession[]): string {
  const header = "Date,Projet,Durée (min),Coûts API (€),Chaînes,Score moyen";
  const rows = sessions.map((s) =>
    `${new Date(s.startTime).toLocaleDateString("fr-FR")},${s.projectName},${s.duration},${(s.totalCost / 100).toFixed(3)},${s.chainsRun},${s.avgScore || "–"}`
  );
  return [header, ...rows].join("\n");
}
