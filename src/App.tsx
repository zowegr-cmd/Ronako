import { useEffect } from "react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Launcher } from "@/screens/Launcher";
import { Workspace } from "@/screens/Workspace";
import { AgentStudio } from "@/screens/AgentStudio";
import { Orchestrator } from "@/screens/Orchestrator";
import { Settings } from "@/screens/Settings";
import { PackManager } from "@/screens/PackManager";
import { useSettingsStore } from "@/store/settingsStore";

export default function App() {
  const { loadApiKey, keyLoaded, checkMonthlyReset } = useSettingsStore();

  useEffect(() => {
    if (!keyLoaded) loadApiKey();
    checkMonthlyReset(); // reset auto si nouveau mois civil
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Launcher />} />
        <Route element={<AppShell />}>
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/studio" element={<AgentStudio />} />
          <Route path="/orchestrator" element={<Orchestrator />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/packs" element={<PackManager />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MemoryRouter>
  );
}
