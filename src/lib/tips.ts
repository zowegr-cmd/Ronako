export interface TipContext {
  lastChainCost: number;    // centimes
  lastTwoScores: number[];
  currentMode: string;
  totalChains: number;
  lastScore: number;
  teamSaved: boolean;
}

export interface Tip {
  id: string;
  condition: (ctx: TipContext) => boolean;
  message: string;
  dismissable: boolean;
  showOnce: boolean;
  action?: string;
  actionLabel?: string;
}

export const TIPS: Tip[] = [
  {
    id: "use_flash_to_validate",
    condition: (ctx) => ctx.lastChainCost > 30, // > €0.30
    message: "💡 Le mode Éclair aurait coûté ~€0.02 pour valider la direction avant de lancer le mode Projet.",
    dismissable: true, showOnce: false,
  },
  {
    id: "low_score_twice",
    condition: (ctx) => ctx.lastTwoScores.length >= 2 && ctx.lastTwoScores.every((s) => s < 7),
    message: "💡 Score en dessous de ta moyenne. Enrichis ton brief avant de relancer — Marcus peut t'aider à le structurer.",
    dismissable: true, showOnce: false,
  },
  {
    id: "relay_disabled_high_cost",
    condition: (ctx) => ctx.currentMode === "flash" && ctx.lastChainCost > 5,
    message: "💡 Le mode Projet active Relay et divise les coûts par 20 avec une meilleure cohérence.",
    dismissable: true, showOnce: false,
  },
  {
    id: "first_deliverable",
    condition: (ctx) => ctx.totalChains === 1,
    message: "🎉 Premier livrable généré ! Explore la Bibliothèque pour retrouver et retravailler tes livrables passés.",
    dismissable: true, showOnce: true,
  },
  {
    id: "high_score_save_team",
    condition: (ctx) => ctx.lastScore >= 9 && !ctx.teamSaved,
    message: "⭐ Score 9/10 ! Tu veux sauvegarder cette équipe pour la réutiliser ?",
    dismissable: true, showOnce: false,
    action: "save_team", actionLabel: "Sauvegarder l'équipe",
  },
];

const DISMISSED_KEY = "ronako-dismissed-tips";

export function loadDismissedTips(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "{}");
  } catch { return {}; }
}

export function dismissTipPermanently(id: string): void {
  const dismissed = loadDismissedTips();
  dismissed[id] = true;
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
}
