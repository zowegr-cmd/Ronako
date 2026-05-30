// ─── Chaînes adaptatives selon le type de livrable ───────────────────────────
// Marcus compose la chaîne minimale nécessaire selon le brief.

export type ChainTemplate = {
  id: string;
  name: string;
  agents: string[];
  reasoning: string;
  keywords: string[];
};

export const CHAIN_TEMPLATES: ChainTemplate[] = [
  {
    id: "prompt_cc",
    name: "Prompt Claude Code",
    keywords: ["claude code", "prompt cc", "terminal", "instructions", "code", "développement", "dev", "script"],
    agents: ["marcus", "nina", "ella", "ryo", "sam"],
    reasoning: "Brief technique → Nina analyse l'architecture, Sam produit le prompt CC",
  },
  {
    id: "email",
    name: "Email / Newsletter",
    keywords: ["email", "newsletter", "mail", "mailing", "emailing"],
    agents: ["marcus", "leo", "ella", "ryo", "sam"],
    reasoning: "Livrable textuel court → Leo rédige, Ella consolide",
  },
  {
    id: "seo_audit",
    name: "Audit SEO",
    keywords: ["seo", "audit seo", "référencement", "mots-clés", "search", "google", "optimisation"],
    agents: ["marcus", "sofia", "ella", "ryo", "sam"],
    reasoning: "Audit SEO pur → Sofia analyse, pas besoin de design/juridique",
  },
  {
    id: "social_media",
    name: "Contenu Réseaux Sociaux",
    keywords: ["réseaux", "social", "instagram", "linkedin", "twitter", "posts", "contenu"],
    agents: ["marcus", "leo", "maya", "ella", "ryo", "sam"],
    reasoning: "Posts multilingues → Leo rédige, Maya adapte culturellement",
  },
  {
    id: "business_strategy",
    name: "Stratégie Business",
    keywords: ["stratégie", "business", "modèle", "marché", "concurrence", "pivot", "croissance"],
    agents: ["marcus", "omar", "sofia", "ella", "ryo", "sam"],
    reasoning: "Stratégie commerciale → Omar + Sofia pour analyse marché complète",
  },
  {
    id: "tech_audit",
    name: "Audit Technique",
    keywords: ["audit technique", "code review", "architecture", "performance", "sécurité", "stack"],
    agents: ["marcus", "nina", "tom", "ella", "ryo", "sam"],
    reasoning: "Audit tech → Nina + Tom, pas besoin de copywriting",
  },
  {
    id: "landing_page",
    name: "Landing Page",
    keywords: ["landing", "page d'atterrissage", "conversion", "cta", "one page"],
    agents: ["marcus", "sofia", "leo", "axel", "nina", "ella", "ryo", "sam"],
    reasoning: "Landing = SEO + textes + design + technique",
  },
  {
    id: "pdf_report",
    name: "Rapport / PDF",
    keywords: ["rapport", "pdf", "document", "dossier", "étude", "analyse", "compte rendu"],
    agents: ["marcus", "omar", "leo", "ella", "ryo", "sam"],
    reasoning: "Document formel → Omar analyse, Leo structure et rédige",
  },
  {
    id: "full_site",
    name: "Site Complet",
    keywords: ["site", "site web", "site complet", "site internet", "création site", "vitrine"],
    agents: ["marcus", "omar", "sofia", "camille", "leo", "axel", "nina", "tom", "ella", "ryo", "sam"],
    reasoning: "Site complet = chaîne complète recommandée",
  },
];

// ─── Détecter le type de livrable depuis le brief ────────────────────────────
export function detectChainTemplate(brief: string, requestedFormats: string[] = []): ChainTemplate | null {
  const text = (brief + " " + requestedFormats.join(" ")).toLowerCase();
  let best: { template: ChainTemplate; score: number } | null = null;

  for (const template of CHAIN_TEMPLATES) {
    const score = template.keywords.filter((kw) => text.includes(kw)).length;
    if (score > 0 && (!best || score > best.score)) {
      best = { template, score };
    }
  }
  return best?.template ?? null;
}

// ─── Agents recommandés mais absents de l'équipe ─────────────────────────────
export function suggestMissingAgents(
  brief: string,
  teamAgentIds: string[],
  allAvailableAgents: string[],
): { id: string; reason: string }[] {
  const text = brief.toLowerCase();
  const teamSet = new Set(teamAgentIds);
  const patterns: Array<{ keywords: string[]; agentId: string; reason: string }> = [
    { keywords: ["mobile", "app mobile", "pwa", "ios", "android"], agentId: "kai", reason: "Brief mentionne une app mobile" },
    { keywords: ["sécurité", "rgpd", "membres", "compte", "authentification"], agentId: "zara", reason: "Site avec données/membres détecté" },
    { keywords: ["dashboard", "tableau de bord", "analytics", "kpi", "reporting"], agentId: "alex", reason: "Brief mentionne un dashboard" },
    { keywords: ["traduction", "multilingue", "anglais", "international"], agentId: "maya", reason: "Brief mentionne des besoins multilingues" },
  ];
  return patterns
    .filter(({ keywords, agentId }) =>
      !teamSet.has(agentId) && allAvailableAgents.includes(agentId) &&
      keywords.some((kw) => text.includes(kw))
    )
    .map(({ agentId, reason }) => ({ id: agentId, reason }));
}

export function suggestMinimalChain(
  brief: string,
  availableAgents: string[],
  requestedFormats: string[] = [],
): { suggestedAgents: string[]; reasoning: string; templateName: string } | null {
  const template = detectChainTemplate(brief, requestedFormats);
  if (!template) return null;

  const validAgents = template.agents.filter((id) => availableAgents.includes(id));
  return {
    suggestedAgents: validAgents,
    reasoning: template.reasoning,
    templateName: template.name,
  };
}
