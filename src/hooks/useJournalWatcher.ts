import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export function useJournalWatcher(projectPath: string | null) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [watching, setWatching] = useState(false);

  // Lecture manuelle
  const refresh = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    try {
      const text = await invoke<string>("read_journal_file", {
        path: `${projectPath}/journal_dev.md`,
      });
      setContent(text);
    } catch {
      setContent(null);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  // Démarrage du watcher Tauri + écoute des events
  useEffect(() => {
    if (!projectPath) return;
    let unlisten: UnlistenFn | null = null;

    const start = async () => {
      try {
        // Lecture initiale
        await refresh();

        // Démarrer le watcher Rust
        await invoke("start_journal_watch", {
          path: `${projectPath}/journal_dev.md`,
        });
        setWatching(true);

        // Écouter les events push depuis Rust
        unlisten = await listen<string>("journal-updated", (ev) => {
          setContent(ev.payload);
        });
      } catch {
        // Le fichier n'existe pas encore — pas grave
      }
    };

    start();

    return () => {
      unlisten?.();
      invoke("stop_journal_watch").catch(() => {});
      setWatching(false);
    };
  }, [projectPath, refresh]);

  return { content, loading, watching, refresh };
}
