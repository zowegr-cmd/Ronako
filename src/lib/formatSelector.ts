// ─── Types de livrables supportés ────────────────────────────────────────────

export interface DeliverableFormat {
  id: string;
  label: string;
  icon: string;
  description: string;
  alwaysIncluded?: boolean;
  requiresConnector?: string;
}

export const DELIVERABLE_FORMATS: Record<string, DeliverableFormat> = {
  prompt_cc: {
    id: "prompt_cc",
    label: "Prompt Claude Code",
    icon: "💻",
    description: "Instructions structurées pour Claude Code",
  },
  markdown: {
    id: "markdown",
    label: "Synthèse Markdown",
    icon: "📝",
    description: "Document de référence propre",
  },
  pdf_brief: {
    id: "pdf_brief",
    label: "Brief PDF",
    icon: "📑",
    description: "Document structuré",
  },
  notion: {
    id: "notion",
    label: "Page Notion",
    icon: "📔",
    description: "Exporté dans Notion",
    requiresConnector: "notion",
  },
  email_sequence: {
    id: "email_sequence",
    label: "Séquence Email",
    icon: "📧",
    description: "Emails prêts à envoyer",
  },
  social_posts: {
    id: "social_posts",
    label: "Posts Réseaux",
    icon: "📱",
    description: "Posts par plateforme",
  },
  action_plan: {
    id: "action_plan",
    label: "Plan d'action",
    icon: "🎯",
    description: "Étapes concrètes priorisées",
  },
};

// ─── Décrire ce que produit chaque agent ─────────────────────────────────────
export const AGENT_DELIVERABLE_DESCRIPTIONS: Record<string, { icon: string; label: string }> = {
  marcus:  { icon: "🎯", label: "Brief opérationnel structuré" },
  omar:    { icon: "📊", label: "Analyse business + marché" },
  sofia:   { icon: "🔍", label: "15-20 mots-clés SEO ciblés" },
  camille: { icon: "⚖️", label: "Conformité légale + mentions" },
  leo:     { icon: "✍️", label: "Textes complets prêts à l'emploi" },
  maya:    { icon: "🌍", label: "Versions multilingues adaptées" },
  axel:    { icon: "🎨", label: "Design system + spécifications visuelles" },
  nina:    { icon: "🏗️", label: "Architecture technique détaillée" },
  tom:     { icon: "✅", label: "Plan QA + critères d'acceptation" },
  ella:    { icon: "📋", label: "Synthèse consolidée sans redondances" },
  ryo:     { icon: "⭐", label: "Score qualité /10 + points d'amélioration" },
  sam:     { icon: "💻", label: "Prompt Claude Code + note technique" },
};

export function getDefaultFormats(): string[] {
  return Object.values(DELIVERABLE_FORMATS)
    .filter((f) => f.alwaysIncluded)
    .map((f) => f.id);
}
