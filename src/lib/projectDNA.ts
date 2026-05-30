// ─── ADN Projet ───────────────────────────────────────────────────────────────
// Bloc de 150 tokens max créé par Marcus au démarrage de chaque chaîne.
// Contient l'essentiel du projet — envoyé à TOUS les agents sans exception.
// Jamais modifié pendant la chaîne (sauf par l'utilisateur avant le lancement).

export const DNA_SYSTEM_PROMPT = `Tu es Marcus. Analyse ce brief et extrait en 150 tokens MAXIMUM les informations essentielles que tous les agents de la chaîne doivent connaître absolument.

Format strict — tirets courts :
- PROJET : [nom et type en 1 ligne]
- CIBLE : [qui, où, tranche d'âge]
- TON : [3 adjectifs maximum]
- OBJECTIF : [1 phrase courte]
- CONTRAINTES : [liste courte, séparées par virgules]
- DIFFÉRENCIATEURS : [2-3 points clés]

Règles absolues :
- Jamais plus de 150 tokens
- Jamais de phrases longues
- Jamais d'informations superflues
- Si une information manque : "non précisé" (ne pas inventer)
- Commencer par "ADN PROJET :"`;

// ─── Format d'injection dans les prompts ──────────────────────────────────────
export function wrapDNA(dna: string): string {
  return `=== ADN PROJET ===\n${dna}\n==================`;
}

// ─── Parse le texte ADN en entrées structurées (pour affichage/édition) ───────
export function parseDNA(dna: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = dna.replace(/^ADN PROJET\s*:?\s*/i, "").split("\n");
  for (const line of lines) {
    const match = line.match(/^[-•]\s*([A-ZÉÈÀÊÎ]+)\s*:\s*(.+)/);
    if (match) result[match[1]] = match[2].trim();
  }
  return result;
}

// ─── Estimation du gain de tokens grâce à Relay ──────────────────────────────
export function estimateRelaySavings(
  fullOutputTokens: number,
  relayOutputTokens: number,
): { savedTokens: number; savingsPct: number } {
  const savedTokens = Math.max(0, fullOutputTokens - relayOutputTokens);
  const savingsPct = fullOutputTokens > 0
    ? Math.round((savedTokens / fullOutputTokens) * 100)
    : 0;
  return { savedTokens, savingsPct };
}
