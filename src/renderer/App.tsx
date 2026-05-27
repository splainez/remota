import { useState } from "react";
import { t } from "../i18n";
import type { Connection } from "../shared/types";
import { ConnectionManager } from "./components/ConnectionManager/ConnectionManager";
import { FileBrowser } from "./components/FileBrowser/FileBrowser";
import { Button } from "./components/ui/button";

export function App() {
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <header className="h-12 w-full bg-surface-dim border-b border-outline-variant flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-6 h-full">
          <span className="text-lg font-bold text-on-surface tracking-tight">{t("app.title")}</span>
          <nav className="hidden md:flex items-center gap-1 h-full">
            <span className="h-full flex items-center text-xs font-semibold uppercase tracking-wider text-primary border-b-2 border-primary px-3 cursor-pointer">
              {t("navigation.explorer")}
            </span>
            <span className="h-full flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground px-3 cursor-pointer transition-colors">
              {t("navigation.sessions")}
            </span>
            <span className="h-full flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground px-3 cursor-pointer transition-colors">
              {t("navigation.logs")}
            </span>
            <span className="h-full flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground px-3 cursor-pointer transition-colors">
              {t("navigation.settings")}
            </span>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            size="xs"
            onClick={() => {
              if (activeConnection) {
                setActiveConnection(null);
              }
            }}
          >
            {activeConnection ? t("connection.disconnect") : t("connection.connect")}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden min-h-0">
        {activeConnection ? (
          <FileBrowser
            connection={activeConnection}
            onDisconnect={() => { setActiveConnection(null); }}
          />
        ) : (
          <ConnectionManager onConnect={setActiveConnection} />
        )}
      </div>

      <footer className="h-[32px] w-full bg-surface-container-lowest border-t border-outline-variant flex items-center justify-between px-4 shrink-0 text-xs text-muted-foreground z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span>{t("app.ready")}</span>
        </div>
        <span>{t("app.version")}</span>
      </footer>
    </div>
  );
}
