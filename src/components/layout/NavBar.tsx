import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  GitFork,
  Settings,
  ChevronLeft,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";

const NAV_ITEMS = [
  { path: "/workspace", icon: LayoutDashboard, label: "Workspace" },
  { path: "/studio", icon: Users, label: "Studio" },
  { path: "/orchestrator", icon: GitFork, label: "Orchestrateur" },
  { path: "/packs", icon: Package, label: "Pack Manager" },
];

export function NavBar() {
  const navigate = useNavigate();
  const { closeProject } = useProjectStore();

  const handleHome = () => {
    closeProject();
    navigate("/");
  };

  return (
    <motion.nav
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.05 }}
      className="w-[58px] flex flex-col items-center py-3 gap-1 border-r border-crystal/50 shrink-0"
    >
      {/* Back to launcher */}
      <button
        onClick={handleHome}
        title="Accueil"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-silk/25 hover:text-silk/60 hover:bg-graphite-light transition-all mb-2"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Divider */}
      <div className="w-6 h-px bg-crystal mb-2" />

      {/* Nav items */}
      {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
        <NavLink key={path} to={path} title={label}>
          {({ isActive }) => (
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
                isActive
                  ? "bg-electric/15 text-electric shadow-[0_0_12px_rgba(0,122,255,0.2)]"
                  : "text-silk/30 hover:text-silk/70 hover:bg-graphite-light",
              )}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
            </motion.div>
          )}
        </NavLink>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <NavLink to="/settings" title="Paramètres">
        {({ isActive }) => (
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
              isActive
                ? "bg-electric/15 text-electric"
                : "text-silk/25 hover:text-silk/60 hover:bg-graphite-light",
            )}
          >
            <Settings size={15} strokeWidth={1.8} />
          </motion.div>
        )}
      </NavLink>
    </motion.nav>
  );
}
