import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
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

// Pas d'AnimatePresence mode="wait" — ça laisse un écran noir entre les pages sur WebView2.
// Solution : simple fade-in sans exit animation. La nouvelle page entre, l'ancienne
// disparaît instantanément (pas de gap noir).

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openAgent, closeChat } = useAgentChat();
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
    document.addEventListener("navigate-workspace", goWorkspace);
    document.addEventListener("open-settings-connectors", goSettings);
    return () => {
      document.removeEventListener("navigate-workspace", goWorkspace);
      document.removeEventListener("open-settings-connectors", goSettings);
    };
  }, [navigate]);

  return (
    <div className="flex flex-col h-screen bg-onyx text-silk overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <NavBar />
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
      <ConsultantDock />
      <ToastContainer />
      <AgentChatModal agent={openAgent} onClose={closeChat} />
      <ShortcutsHelp />
      <ProductTour />
    </div>
  );
}
