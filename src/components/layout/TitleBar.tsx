import { type ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AppLogo } from "@/components/ui/AppLogo";
import { useState, useEffect } from "react";
import { Minus, Square, X, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized);
    const unlisten = appWindow.onResized(async () => {
      setIsMaximized(await appWindow.isMaximized());
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="h-10 flex items-center justify-between px-4 shrink-0 select-none border-b border-crystal/50"
    >
      {/* Logo left */}
      <div className="flex items-center pointer-events-none" data-tauri-drag-region>
        <AppLogo size={20} />
      </div>

      {/* Draggable center zone */}
      <div className="flex-1 h-full" data-tauri-drag-region />

      {/* Window controls */}
      <div className="flex items-center gap-1">
        <TitleBarButton
          onClick={() => appWindow.minimize()}
          className="hover:bg-warning/20 hover:text-warning"
          title="Réduire"
        >
          <Minus size={11} />
        </TitleBarButton>
        <TitleBarButton
          onClick={() => appWindow.toggleMaximize()}
          className="hover:bg-success/20 hover:text-success"
          title={isMaximized ? "Restaurer" : "Agrandir"}
        >
          {isMaximized ? <Square size={10} /> : <Maximize2 size={10} />}
        </TitleBarButton>
        <TitleBarButton
          onClick={() => appWindow.close()}
          className="hover:bg-danger/20 hover:text-danger"
          title="Fermer"
        >
          <X size={11} />
        </TitleBarButton>
      </div>
    </div>
  );
}

function TitleBarButton({
  children,
  onClick,
  className,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center",
        "text-silk/30 transition-all duration-150",
        className,
      )}
    >
      {children}
    </button>
  );
}
