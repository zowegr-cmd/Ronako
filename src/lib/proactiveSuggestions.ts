import type { Skill } from "@/types";

export interface ProactiveSuggestion {
  type: "skill" | "connector" | "pack";
  priority: number;
  title?: string;
  message: string;
  actionLabel: string;
  action: string;
  costImpact?: string;
}

interface SuggestionContext {
  brief: string;
  activeSkills: Skill[];
  installedConnectors: string[];
  ignoredSuggestions: Record<string, number>;
}

function ignored(ctx: SuggestionContext, action: string): boolean {
  return (ctx.ignoredSuggestions[action] ?? 0) >= 3;
}

export function detectMissingSuggestions(ctx: SuggestionContext): ProactiveSuggestion | null {
  const t = ctx.brief.toLowerCase();
  const { activeSkills: skills, installedConnectors: conns } = ctx;
  const candidates: ProactiveSuggestion[] = [];

  // SEO / Référencement
  if (
    !ignored(ctx, "activate_skill_seo") &&
    /seo|référencement|google|moteur de recherche|ranking/.test(t) &&
    !skills.some((s) => s.agentIds.includes("sofia") && s.isActive)
  ) {
    candidates.push({
      type: "skill", priority: 9,
      title: "Skill SEO suggéré",
      message: "Ton brief mentionne du référencement. Le skill SEO Produit sur Sofia améliorerait la qualité.",
      actionLabel: "Activer pour cette chaîne",
      action: "activate_skill_seo",
      costImpact: "+$0.001",
    });
  }

  // Email / Newsletter
  if (
    !ignored(ctx, "activate_skill_email") &&
    /email|newsletter|emailing|séquence mail/.test(t) &&
    !skills.some((s) => s.name.toLowerCase().includes("email") && s.isActive)
  ) {
    candidates.push({
      type: "skill", priority: 8,
      message: "Ton brief mentionne des emails. Le skill Email Marketing sur Leo produirait de meilleurs résultats.",
      actionLabel: "Activer pour cette chaîne",
      action: "activate_skill_email",
      costImpact: "+$0.001",
    });
  }

  // Image / Visuel
  if (
    !ignored(ctx, "open_pack_manager_image") &&
    /image|logo|visuel|photo|illustration|bannière/.test(t) &&
    !conns.includes("flux") && !conns.includes("openai")
  ) {
    candidates.push({
      type: "connector", priority: 7,
      message: "Ton brief mentionne des visuels. Le connecteur Flux permettrait de générer de vraies images ($0.003/img).",
      actionLabel: "Voir les connecteurs",
      action: "open_pack_manager_image",
      costImpact: "$0.003/image",
    });
  }

  // E-commerce
  if (
    !ignored(ctx, "show_pack_ecommerce") &&
    /boutique|e-commerce|shop|vente en ligne|produit.*fiche|fiche.*produit/.test(t) &&
    !skills.some((s) => s.sector === "ecommerce" && s.isActive)
  ) {
    candidates.push({
      type: "pack", priority: 8,
      message: "Ton brief ressemble à un projet e-commerce. Le Pack E-Commerce optimiserait tous tes agents.",
      actionLabel: "Voir le pack",
      action: "show_pack_ecommerce",
      costImpact: "+$0.002/chaîne",
    });
  }

  // Local
  if (
    !ignored(ctx, "show_pack_local") &&
    /\blocal\b|proximité|quartier|ma ville|région/.test(t) &&
    !skills.some((s) => s.name.toLowerCase().includes("local") && s.isActive)
  ) {
    candidates.push({
      type: "pack", priority: 7,
      message: "Projet local détecté. Le Pack Local Business inclurait le SEO local et le ton de proximité.",
      actionLabel: "Voir le pack",
      action: "show_pack_local",
      costImpact: "+$0.001/chaîne",
    });
  }

  // Social media
  if (
    !ignored(ctx, "activate_skill_social") &&
    /social|instagram|linkedin|twitter|tiktok|réseaux sociaux/.test(t) &&
    !skills.some((s) => s.name.toLowerCase().includes("social") && s.isActive)
  ) {
    candidates.push({
      type: "skill", priority: 7,
      message: "Ton brief mentionne les réseaux sociaux. Le skill Social Media Strategy sur Leo améliorerait le format des posts.",
      actionLabel: "Activer pour cette chaîne",
      action: "activate_skill_social",
      costImpact: "+$0.001",
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0];
}
