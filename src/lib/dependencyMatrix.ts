// ─── Matrice de dépendances des agents ────────────────────────────────────────
// Définit quels agents Relay doit résumer pour préparer chaque agent destinataire.
// Relay collecte les résumés de ces agents et produit un contexte ciblé unique.
//
// Logique : un agent X reçoit les résumés Relay de tous les agents
//           listés dans DEPENDENCY_MATRIX[x.id] qui ont DÉJÀ tourné
//           dans la chaîne courante.
//
// Si un agent n'est pas dans la matrice (agent custom) :
//   → Relay reçoit uniquement l'output direct de l'agent précédent.

export const DEPENDENCY_MATRIX: Record<string, string[]> = {
  // Agents de base — pas de dépendances (reçoivent l'ADN uniquement)
  omar:    [],
  camille: [],

  // Agents avec dépendances simples
  sofia:   ["omar"],
  maya:    ["leo"],
  axel:    ["omar"],
  zara:    ["nina"],
  alex:    ["omar", "nina"],

  // Agents avec dépendances multiples
  leo:     ["omar", "sofia", "camille"],
  yuna:    ["omar", "camille"],
  kai:     ["nina", "axel"],
  nina:    ["omar", "camille"],
  tom:     ["nina", "zara"],

  // Ella reçoit tout le monde
  ella:    ["omar", "sofia", "camille", "leo", "maya", "axel", "nina", "tom"],

  // Ryo et Sam reçoivent les agents de fin
  ryo:     ["ella"],
  sam:     ["ryo", "nina"],
};

// ─── Groupes d'agents parallélisables ────────────────────────────────────────
// Agents sans dépendances croisées = peuvent tourner simultanément
export const PARALLEL_GROUPS: string[][] = [
  ["omar", "camille"],  // analyse business + légal : indépendants
  ["sofia", "camille"], // SEO + légal : indépendants
  ["axel", "nina"],     // design + architecture : indépendants
  ["tom", "axel"],      // QA + design : indépendants
  ["maya", "axel"],     // traduction + design : indépendants
];

export function canRunParallel(agentA: string, agentB: string): boolean {
  return PARALLEL_GROUPS.some(
    (group) => group.includes(agentA) && group.includes(agentB),
  );
}

// ─── Résoudre les dépendances disponibles pour un agent donné ─────────────────
// Retourne les IDs des agents dont les résumés sont disponibles ET attendus.
export function resolveDependencies(
  agentId: string,
  availableRelayIds: Set<string>,
): string[] {
  const deps = DEPENDENCY_MATRIX[agentId];
  if (!deps) return []; // agent custom — pas dans la matrice
  return deps.filter((depId) => availableRelayIds.has(depId));
}

// ─── Construire le contexte multi-dépendances pour Relay ─────────────────────
export function buildDependencyContext(
  agentId: string,
  relayOutputs: Record<string, string>,
  previousAgentId?: string,
): string {
  const deps = resolveDependencies(agentId, new Set(Object.keys(relayOutputs)));

  if (deps.length === 0) {
    // Pas de dépendances ou agent custom → contexte de l'agent précédent direct
    if (previousAgentId && relayOutputs[previousAgentId]) {
      return relayOutputs[previousAgentId];
    }
    return "";
  }

  // Concaténer les résumés des dépendances (chacun ~150 tokens)
  return deps
    .map((depId) => relayOutputs[depId])
    .filter(Boolean)
    .join("\n\n---\n\n");
}
