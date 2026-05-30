// ─── Parseur de l'output de Ryo ───────────────────────────────────────────────
// Ryo produit un format structuré. Ce parseur extrait score, points, verdict.

export interface RyoResult {
  score: number;           // 0-10
  scoreLabel: string;      // "Excellent" / "Bon" / "Correct" / "À améliorer" / "Rejeté"
  scoreColor: string;      // couleur hex selon score
  scoreBg: string;         // couleur fond (opaque)
  points: string[];        // points forts
  weaknesses: string[];    // points faibles
  recommendation: string;  // que faire ensuite
  verdict: "VALIDÉ" | "À AMÉLIORER" | "REJETÉ" | "NON ÉVALUÉ";
  raw: string;             // output complet original
}

export function parseRyoOutput(output: string): RyoResult {
  // ── Extraire le score ─────────────────────────────────────────
  const scorePatterns = [
    /SCORE\s*:?\s*(\d+)\s*\/\s*10/i,
    /(\d+)\s*\/\s*10/,
    /note\s*:?\s*(\d+)\s*\/\s*10/i,
    /score\s*:?\s*(\d+)/i,
  ];
  let score = 0;
  for (const pattern of scorePatterns) {
    const m = output.match(pattern);
    if (m) { score = Math.min(10, Math.max(0, parseInt(m[1]))); break; }
  }

  // ── Extraire les sections ─────────────────────────────────────
  const extractSection = (text: string, startPattern: RegExp, endPattern: RegExp): string => {
    const start = text.search(startPattern);
    if (start === -1) return "";
    const sub = text.slice(start);
    const end = sub.search(endPattern);
    return end === -1 ? sub : sub.slice(0, end);
  };

  const extractBullets = (section: string): string[] =>
    section
      .split("\n")
      .map((l) => l.replace(/^[-•*✅⚠️🔴🟡🟢]\s*/, "").trim())
      .filter((l) => l.length > 5 && !/^\w+\s*:/.test(l));

  const fortsSection = extractSection(output,
    /POINTS?\s+FORTS?\s*:/i,
    /POINTS?\s+FAIBLES?|RECOMMANDATION|VERDICT/i,
  );
  const faiblesSection = extractSection(output,
    /POINTS?\s+FAIBLES?\s*:/i,
    /RECOMMANDATION|VERDICT/i,
  );

  const points = extractBullets(fortsSection).slice(0, 5);
  const weaknesses = extractBullets(faiblesSection).slice(0, 5);

  // ── Recommandation ────────────────────────────────────────────
  const recMatch = output.match(/RECOMMANDATION\s*:?\s*([^\n]{10,})/i);
  const recommendation = recMatch ? recMatch[1].trim() : "";

  // ── Verdict ────────────────────────────────────────────────────
  const verdictMatch = output.match(/VERDICT\s*:?\s*(VALID[EÉ]|À AMÉLIORER|REJET[EÉ])/i);
  let verdict: RyoResult["verdict"] = "NON ÉVALUÉ";
  if (verdictMatch) {
    const v = verdictMatch[1].toUpperCase();
    if (v.includes("VALID")) verdict = "VALIDÉ";
    else if (v.includes("AMÉL")) verdict = "À AMÉLIORER";
    else if (v.includes("REJET")) verdict = "REJETÉ";
  } else if (score >= 8) verdict = "VALIDÉ";
  else if (score >= 5) verdict = "À AMÉLIORER";
  else if (score > 0) verdict = "REJETÉ";

  // ── Couleurs selon score ───────────────────────────────────────
  let scoreLabel = "Non évalué";
  let scoreColor = "#6B7280";
  let scoreBg = "#6B728015";
  if (score >= 9) { scoreLabel = "Excellent"; scoreColor = "#10B981"; scoreBg = "#10B98115"; }
  else if (score >= 8) { scoreLabel = "Bon"; scoreColor = "#10B981"; scoreBg = "#10B98115"; }
  else if (score >= 6) { scoreLabel = "Correct"; scoreColor = "#F59E0B"; scoreBg = "#F59E0B15"; }
  else if (score >= 4) { scoreLabel = "À améliorer"; scoreColor = "#EF4444"; scoreBg = "#EF444415"; }
  else if (score > 0) { scoreLabel = "Rejeté"; scoreColor = "#EF4444"; scoreBg = "#EF444415"; }

  return { score, scoreLabel, scoreColor, scoreBg, points, weaknesses, recommendation, verdict, raw: output };
}

// ─── Identifier les agents responsables des points faibles ───────────────────
// Utilisé par ReworkModal pour "Corriger les points faibles"
const AGENT_KEYWORDS: Record<string, string[]> = {
  omar:    ["business", "marché", "concurren", "chiffr", "économ", "stratégie business"],
  sofia:   ["seo", "mot-clé", "référencement", "search", "google"],
  camille: ["juridique", "légal", "conformité", "rgpd", "mention"],
  leo:     ["cta", "texte", "rédaction", "copy", "accroche", "ton"],
  maya:    ["traduction", "langue", "version", "fr", "en", "culturel"],
  axel:    ["design", "visuel", "ui", "couleur", "layout"],
  nina:    ["technique", "architecture", "stack", "performance"],
  tom:     ["test", "qa", "bug", "sécurité", "validation"],
};

export function identifyAgentsFromWeaknesses(weaknesses: string[]): string[] {
  const found = new Set<string>();
  const text = weaknesses.join(" ").toLowerCase();
  for (const [agentId, keywords] of Object.entries(AGENT_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) found.add(agentId);
  }
  return Array.from(found);
}
