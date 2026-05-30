import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TitleBar } from "./TitleBar";
import { NavBar } from "./NavBar";
import { ConsultantDock } from "./ConsultantDock";
import { ToastContainer } from "@/components/ui/Toast";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AgentChatModal, useAgentChat } from "@/components/agents/AgentChatModal";
import { ShortcutsHelp } from "@/components/ui/ShortcutsHelp";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ProductTour } from "@/components/onboarding/ProductTour";
import { useSettingsStore } from "@/store/settingsStore";

// Pas d'AnimatePresence mode="wait" — ça laisse un écran noir entre les pages sur WebView2.
// Solution : simple fade-in sans exit animation. La nouvelle page entre, l'ancienne
// disparaît instantanément (pas de gap noir).

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openAgent, closeChat } = useAgentChat();
  const { focusMode, setFocusMode } = useSettingsStore();
  useKeyboardShortcuts();

  // Protection fermeture (6.15)
  useEffect(() => {
    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      const appWindow = getCurrentWindow();
      let unlisten: (() => void) | null = null;
      appWindow.onCloseRequested(async (event) => {
        const { useChainStore: cs } = await import("@/store/chainStore");
        const state = cs.getState();
        if (state.run.status === "running") {
          event.preventDefault();
          const ok = window.confirm("Une chaîne est en cours. Fermer Ronako l'arrêtera.");
          if (ok) { state.stopRun(); await appWindow.close(); }
        }
      }).then((fn) => { unlisten = fn; });
      return () => { unlisten?.(); };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listener navigation depuis les actions consultants
  useEffect(() => {
    const goWorkspace = () => navigate("/workspace");
    const goSettings  = () => navigate("/settings");
    const goPacks     = () => navigate("/packs");
    document.addEventListener("navigate-workspace", goWorkspace);
    document.addEventListener("open-settings-connectors", goSettings);
    document.addEventListener("navigate-packs", goPacks);
    return () => {
      document.removeEventListener("navigate-workspace", goWorkspace);
      document.removeEventListener("open-settings-connectors", goSettings);
      document.removeEventListener("navigate-packs", goPacks);
    };
  }, [navigate]);

  // Écouter l'event toggle-focus depuis le raccourci clavier
  useEffect(() => {
    const handler = () => setFocusMode(!focusMode);
    document.addEventListener("toggle-focus-mode", handler);
    return () => document.removeEventListener("toggle-focus-mode", handler);
  }, [focusMode, setFocusMode]);

  return (
    <div className="flex flex-col h-screen bg-onyx text-silk overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence initial={false}>
          {!focusMode && (
            <motion.div key="navbar"
              initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden shrink-0">
              <NavBar />
            </motion.div>
          )}
        </AnimatePresence>
        <main className="flex-1 overflow-hidden relative bg-onyx">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute inset-0 overflow-auto bg-onyx"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      {!focusMode && <ConsultantDock />}
      {focusMode && (
        <button
          onClick={() => setFocusMode(false)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 px-2.5 py-1.5 bg-graphite border border-crystal/50 rounded-xl text-[10px] text-silk/40 hover:text-silk hover:border-crystal-light transition-all">
          ✕ Quitter Mode Focus
        </button>
      )}
      <ToastContainer />
      <AgentChatModal agent={openAgent} onClose={closeChat} />
      <ShortcutsHelp />
      <ProductTour />
    </div>
  );
}
