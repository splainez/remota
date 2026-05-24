import { useState } from "react";
import type { Connection } from "../shared/types";
import { ConnectionManager } from "./components/ConnectionManager/ConnectionManager";
import { FileBrowser } from "./components/FileBrowser/FileBrowser";

export function App() {
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null);

  if (activeConnection) {
    return (
      <FileBrowser
        connection={activeConnection}
        onDisconnect={() => setActiveConnection(null)}
      />
    );
  }

  return <ConnectionManager onConnect={setActiveConnection} />;
}
