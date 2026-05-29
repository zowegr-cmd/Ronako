import { useEffect } from "react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Launcher } from "@/screens/Launcher";
import { Workspace } from "@/screens/Workspace";
import { AgentStudio } from "@/screens/AgentStudio";
import { Orchestrator } from "@/screens/Orchestrator";
import { Settings } from "@/screens/Settings";
import { useSettingsStore } from "@/store/settingsStore";

export default function App() {
  const { loadApiKey, keyLoaded } = useSettingsStore();

  // Charger la clé API depuis le keyring OS au premier démarrage
  useEffect(() => {
    if (!keyLoaded) loadApiKey();
  }, [keyLoaded, loadApiKey]);

  return (
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Launcher />} />
        <Route element={<AppShell />}>
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/studio" element={<AgentStudio />} />
          <Route path="/orchestrator" element={<Orchestrator />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MemoryRouter>
  );
}
