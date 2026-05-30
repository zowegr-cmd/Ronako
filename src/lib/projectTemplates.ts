import type { ChainMode } from "@/types";

export interface ProjectTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  agents: string[];
  mode: ChainMode;
  keywords: string[]; // pour détection automatique par Marcus
  briefGuide?: string[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "site_vitrine",
    name: "Site Vitrine",
    icon: "🌐",
    description: "Site de présentation professionnel",
    keywords: ["site vitrine", "site web", "présentation", "vitrine", "site professionnel"],
    agents: ["marcus","omar","sofia","camille","leo","axel","nina","tom","ella","ryo","sam"],
    mode: "project",
    briefGuide: ["Secteur d'activité ?", "Zone géographique ?", "Objectif principal du site ?"],
  },
  {
    id: "ecommerce",
    name: "E-Commerce",
    icon: "🛒",
    description: "Boutique en ligne complète",
    keywords: ["e-commerce", "ecommerce", "boutique", "vente en ligne", "shop"],
    agents: ["marcus","omar","sofia","camille","leo","axel","nina","tom","ella","ryo","sam"],
    mode: "project",
  },
  {
    id: "saas",
    name: "Application SaaS",
    icon: "⚡",
    description: "App web avec espace membres",
    keywords: ["saas", "application", "app", "espace membres", "abonnement", "plateforme"],
    agents: ["marcus","omar","sofia","nina","tom","ella","ryo","sam"],
    mode: "project",
  },
  {
    id: "marketing",
    name: "Campagne Marketing",
    icon: "📣",
    description: "Stratégie et contenus marketing",
    keywords: ["marketing", "campagne", "publicité", "ads", "contenu", "communication"],
    agents: ["marcus","omar","sofia","leo","maya","ella","ryo","sam"],
    mode: "project",
  },
  {
    id: "audit_tech",
    name: "Audit Technique",
    icon: "🔍",
    description: "Analyse et recommandations techniques",
    keywords: ["audit", "analyse technique", "code review", "performance", "sécurité"],
    agents: ["marcus","nina","tom","ella","ryo","sam"],
    mode: "project",
  },
  {
    id: "pitch",
    name: "Pitch Investisseur",
    icon: "💼",
    description: "Présentation et argumentaire business",
    keywords: ["pitch", "investisseur", "levée de fonds", "startup", "deck"],
    agents: ["marcus","omar","leo","ella","ryo","sam"],
    mode: "infinite",
  },
  {
    id: "seo_content",
    name: "Contenu SEO",
    icon: "📈",
    description: "Articles et textes optimisés SEO",
    keywords: ["seo", "article", "blog", "contenu", "rédaction", "référencement"],
    agents: ["marcus","sofia","leo","maya","ella","ryo","sam"],
    mode: "project",
  },
  {
    id: "prompt_cc",
    name: "Prompt Claude Code",
    icon: "💻",
    description: "Brief technique pour Claude Code",
    keywords: ["claude code", "prompt", "développement", "code", "feature", "bug", "refactoring"],
    agents: ["marcus","nina","tom","ella","ryo","sam"],
    mode: "flash",
  },
  // ── Templates visuels ──────────────────────────────────────────────────────
  {
    id: "identite_visuelle",
    name: "Identité Visuelle",
    icon: "🎨",
    description: "Logo, charte graphique et assets visuels IA",
    keywords: ["logo", "identité visuelle", "charte graphique", "branding", "visual identity"],
    agents: ["marcus", "omar", "axel", "pixel", "ryo", "sam"],
    mode: "project",
    briefGuide: ["Secteur d'activité ?", "Valeurs de la marque ?", "Couleurs préférées ?"],
  },
  {
    id: "contenu_social",
    name: "Contenu Social Media",
    icon: "📱",
    description: "Visuels et posts optimisés pour les réseaux",
    keywords: ["social media", "instagram", "linkedin", "réseaux sociaux", "posts", "stories"],
    agents: ["marcus", "leo", "axel", "pixel", "ryo", "sam"],
    mode: "project",
  },
  {
    id: "campagne_pub",
    name: "Campagne Publicitaire",
    icon: "📣",
    description: "Visuels + voix off pour campagne complète",
    keywords: ["campagne", "publicité", "ads", "spot", "publicitaire"],
    agents: ["marcus", "omar", "leo", "axel", "pixel", "voice", "ryo", "sam"],
    mode: "infinite",
  },
  {
    id: "video_promo",
    name: "Vidéo Promotionnelle",
    icon: "🎬",
    description: "Image + animation + narration audio complète",
    keywords: ["vidéo", "video", "animation", "promo", "motion", "film"],
    agents: ["marcus", "leo", "axel", "pixel", "motion", "voice", "ryo", "sam"],
    mode: "infinite",
  },
];

// Détecter le template selon le brief de l'utilisateur
export function detectTemplate(brief: string): ProjectTemplate | null {
  const text = brief.toLowerCase();
  let best: { template: ProjectTemplate; score: number } | null = null;
  for (const tpl of PROJECT_TEMPLATES) {
    const score = tpl.keywords.filter((kw) => text.includes(kw)).length;
    if (score > 0 && (!best || score > best.score)) {
      best = { template: tpl, score };
    }
  }
  return best?.template ?? null;
}
