import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const tag = (document.activeElement as HTMLElement)?.tagName ?? "";
      const isTyping = ["INPUT", "TEXTAREA"].includes(tag) ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      // Cmd+? → aide (jamais désactivé)
      if (mod && e.key === "?") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("show-shortcuts"));
        return;
      }

      // Escape → fermer modal
      if (e.key === "Escape") {
        document.dispatchEvent(new CustomEvent("close-modal"));
        return;
      }

      if (isTyping) return; // désactiver les autres raccourcis en mode saisie

      if (mod) {
        switch (e.key) {
          case "1": e.preventDefault(); navigate("/workspace"); break;
          case "2": e.preventDefault(); navigate("/studio"); break;
          case "3": e.preventDefault(); navigate("/orchestrator"); break;
          case "4": e.preventDefault(); navigate("/settings"); break;
          case "Enter":
            e.preventDefault();
            document.dispatchEvent(new CustomEvent("marcus-send"));
            break;
          case "l":
          case "L":
            e.preventDefault();
            document.dispatchEvent(new CustomEvent("chain-launch"));
            break;
          case "s":
          case "S":
            e.preventDefault();
            document.dispatchEvent(new CustomEvent("chain-stop"));
            break;
          case "f":
          case "F":
            if (e.shiftKey) {
              e.preventDefault();
              document.dispatchEvent(new CustomEvent("toggle-focus-mode"));
            }
            break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
}
