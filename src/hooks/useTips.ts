import { useState, useCallback } from "react";
import { TIPS, loadDismissedTips, dismissTipPermanently, type Tip, type TipContext } from "@/lib/tips";

export function useTips() {
  const [activeTip, setActiveTip] = useState<Tip | null>(null);

  const evaluateTips = useCallback((context: TipContext) => {
    const dismissed = loadDismissedTips();
    const tip = TIPS.find((t) => {
      if (dismissed[t.id] && t.showOnce) return false;
      return t.condition(context);
    });
    if (tip) {
      setTimeout(() => setActiveTip(tip), 1500);
    }
  }, []);

  const dismissTip = useCallback((id: string, permanent = false) => {
    setActiveTip(null);
    if (permanent) dismissTipPermanently(id);
  }, []);

  return { activeTip, evaluateTips, dismissTip };
}
