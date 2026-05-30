import { invoke } from "@tauri-apps/api/core";
import { now } from "@/lib/utils";

// TTL par agent (ms)
const CACHE_TTL: Record<string, number> = {
  sofia:   7 * 24 * 60 * 60 * 1000,  // 7 jours
  nina:    24 * 60 * 60 * 1000,       // 24h
  camille: 30 * 24 * 60 * 60 * 1000, // 30 jours
  omar:    7 * 24 * 60 * 60 * 1000,
};

// Agents dont on ne cache PAS les résultats (créatifs ou orchestrateurs)
const NO_CACHE_AGENTS = new Set(["marcus", "ella", "ryo", "sam", "leo", "relay"]);

interface CacheEntry {
  agentId: string;
  briefHash: string;
  output: string;
  createdAt: string;
  savedCost: number; // centimes économisés
}

// Hash simple du brief (déterministe)
function hashBrief(brief: string): string {
  let hash = 0;
  for (let i = 0; i < brief.length; i++) {
    hash = ((hash << 5) - hash) + brief.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getCacheKey(agentId: string, brief: string): string {
  return `${agentId}_${hashBrief(brief.slice(0, 200))}`;
}

async function loadCacheStore(): Promise<Record<string, CacheEntry>> {
  try {
    const raw = await invoke<string>("load_project_state", { projectId: "__analysis_cache__" });
    return JSON.parse(raw) as Record<string, CacheEntry>;
  } catch { return {}; }
}

async function saveCacheStore(store: Record<string, CacheEntry>): Promise<void> {
  await invoke("save_project_state", {
    projectId: "__analysis_cache__",
    state: JSON.stringify(store, null, 2),
  });
}

export async function getCachedAnalysis(
  agentId: string,
  brief: string,
): Promise<CacheEntry | null> {
  if (NO_CACHE_AGENTS.has(agentId)) return null;
  const ttl = CACHE_TTL[agentId];
  if (!ttl) return null;

  const store = await loadCacheStore();
  const key = getCacheKey(agentId, brief);
  const entry = store[key];
  if (!entry) return null;

  const age = Date.now() - new Date(entry.createdAt).getTime();
  if (age > ttl) return null;

  return entry;
}

export async function cacheAnalysis(
  agentId: string,
  brief: string,
  output: string,
  savedCost: number,
): Promise<void> {
  if (NO_CACHE_AGENTS.has(agentId)) return;
  if (!CACHE_TTL[agentId]) return;

  const store = await loadCacheStore();
  const key = getCacheKey(agentId, brief);
  store[key] = { agentId, briefHash: hashBrief(brief), output, createdAt: now(), savedCost };

  // Nettoyer les entrées expirées
  const ttl = CACHE_TTL[agentId] ?? 0;
  for (const [k, v] of Object.entries(store)) {
    if (Date.now() - new Date(v.createdAt).getTime() > (CACHE_TTL[v.agentId] ?? ttl)) {
      delete store[k];
    }
  }

  await saveCacheStore(store);
}

export function formatCacheSavings(entry: CacheEntry): string {
  const date = new Date(entry.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return `${entry.agentId} — résultat du ${date} réutilisé 💰 ~${(entry.savedCost / 100).toFixed(3)}€ économisé`;
}
