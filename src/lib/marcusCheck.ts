// ─── Marcus Check ─────────────────────────────────────────────────────────────
// Vérification de cohérence silencieuse avant chaque agent.
// Marcus compare le résumé Relay avec l'ADN Projet.
// Coût : ~100 tokens input + 20 output = $0.0004 par check (négligeable).
// L'utilisateur ne voit pas ce check — il est transparent.

export const MARCUS_CHECK_PROMPT = `Compare ce résumé Relay avec l'ADN du projet. Y a-t-il des contradictions ou des informations manquantes critiques ?

Réponds UNIQUEMENT par :
OK
ou
CORRECTION: [correction en 1 ligne maximum, 20 tokens max]

Rien d'autre. Jamais de phrases supplémentaires.`;

export function buildMarcusCheckInput(dna: string, relayContext: string): string {
  return `ADN PROJET :
${dna}

RÉSUMÉ RELAY :
${relayContext}`;
}

// ─── Parser la réponse du Marcus Check ───────────────────────────────────────
export interface MarcusCheckResult {
  ok: boolean;
  correction?: string;
}

export function parseMarcusCheckResponse(response: string): MarcusCheckResult {
  const trimmed = response.trim();
  if (trimmed.toUpperCase().startsWith("OK")) {
    return { ok: true };
  }
  const correctionMatch = trimmed.match(/^CORRECTION:\s*(.+)/i);
  if (correctionMatch) {
    return { ok: false, correction: correctionMatch[1].trim() };
  }
  // Réponse inattendue → on considère OK (jamais bloquer la chaîne)
  return { ok: true };
}

// ─── Appliquer la correction au résumé Relay ─────────────────────────────────
export function applyMarcusCorrection(relayContext: string, correction: string): string {
  return `${relayContext}\n\n[CORRECTION MARCUS] ${correction}`;
}
