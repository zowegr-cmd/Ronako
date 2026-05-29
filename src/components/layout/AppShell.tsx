import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { TitleBar } from "./TitleBar";
import { NavBar } from "./NavBar";
import { ConsultantDock } from "./ConsultantDock";
import { ToastContainer } from "@/components/ui/Toast";

// Pas de filter:blur — WebView2/Windows ne gère pas bien ce filtre en animation
const pageVariants = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

const pageTransition = {
  duration: 0.2,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

export function AppShell() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-screen bg-onyx text-silk overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <NavBar />
        <main className="flex-1 overflow-hidden relative bg-onyx">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              className="absolute inset-0 overflow-auto bg-onyx"
              style={{ willChange: "opacity, transform" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <ConsultantDock />
      <ToastContainer />
    </div>
  );
}
