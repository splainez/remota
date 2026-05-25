import { useCallback, useEffect, useRef, useState } from "react";
import type { FileEntry } from "../../shared/types";

interface UseFileListResult {
  entries: FileEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useFileList(path: string, isMocked: boolean): UseFileListResult {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadIdRef = useRef(0);

  const load = useCallback(async () => {
    const loadId = ++loadIdRef.current;
    setLoading(true);
    setError(null);
    try {
      let result: FileEntry[];
      if (isMocked) {
        result = getMockEntries(path);
      } else {
        result = await window.api.filesystem.list(path);
      }
      if (loadId === loadIdRef.current) {
        setEntries(result);
        setLoading(false);
      }
    } catch (err) {
      if (loadId === loadIdRef.current) {
        setError(String(err));
        setEntries([]);
        setLoading(false);
      }
    }
  }, [path, isMocked]);

  useEffect(() => {
    void load();
  }, [load]);

  return { entries, loading, error, refresh: load };
}


function getMockEntries(path: string): FileEntry[] {
  const normalized = path.replace(/\\/g, "/").replace(/\/$/, "") || "/";

  const mockFs: Record<string, FileEntry[]> = {
    "/": [
      { name: "home", fullPath: "/home", isDirectory: true, size: 0, modified: "2024-01-15T10:30:00Z" },
      { name: "var", fullPath: "/var", isDirectory: true, size: 0, modified: "2024-01-10T08:00:00Z" },
      { name: "etc", fullPath: "/etc", isDirectory: true, size: 0, modified: "2024-01-01T00:00:00Z" },
      { name: "tmp", fullPath: "/tmp", isDirectory: true, size: 0, modified: "2024-12-20T12:00:00Z" },
      { name: "usr", fullPath: "/usr", isDirectory: true, size: 0, modified: "2024-06-15T09:00:00Z" },
      { name: "README.md", fullPath: "/README.md", isDirectory: false, size: 2048, modified: "2025-03-01T08:00:00Z" },
    ],
    "/home": [
      { name: "admin", fullPath: "/home/admin", isDirectory: true, size: 0, modified: "2024-03-20T14:00:00Z" },
      { name: "deploy", fullPath: "/home/deploy", isDirectory: true, size: 0, modified: "2025-01-10T11:00:00Z" },
      { name: ".bashrc", fullPath: "/home/.bashrc", isDirectory: false, size: 512, modified: "2024-11-01T10:00:00Z" },
    ],
    "/home/admin": [
      { name: "projects", fullPath: "/home/admin/projects", isDirectory: true, size: 0, modified: "2025-04-01T09:00:00Z" },
      { name: "backups", fullPath: "/home/admin/backups", isDirectory: true, size: 0, modified: "2025-02-15T16:30:00Z" },
      { name: "notes.txt", fullPath: "/home/admin/notes.txt", isDirectory: false, size: 256, modified: "2025-05-20T08:00:00Z" },
      { name: "config.json", fullPath: "/home/admin/config.json", isDirectory: false, size: 1024, modified: "2025-05-10T12:00:00Z" },
    ],
    "/home/admin/projects": [
      { name: "webapp", fullPath: "/home/admin/projects/webapp", isDirectory: true, size: 0, modified: "2025-05-15T10:00:00Z" },
      { name: "api", fullPath: "/home/admin/projects/api", isDirectory: true, size: 0, modified: "2025-04-20T14:30:00Z" },
    ],
    "/home/admin/projects/webapp": [
      { name: "index.html", fullPath: "/home/admin/projects/webapp/index.html", isDirectory: false, size: 4096, modified: "2025-05-18T11:00:00Z" },
      { name: "style.css", fullPath: "/home/admin/projects/webapp/style.css", isDirectory: false, size: 8192, modified: "2025-05-17T09:30:00Z" },
      { name: "app.js", fullPath: "/home/admin/projects/webapp/app.js", isDirectory: false, size: 16384, modified: "2025-05-19T15:00:00Z" },
    ],
    "/home/deploy": [
      { name: "scripts", fullPath: "/home/deploy/scripts", isDirectory: true, size: 0, modified: "2025-01-10T11:30:00Z" },
      { name: "docker-compose.yml", fullPath: "/home/deploy/docker-compose.yml", isDirectory: false, size: 2048, modified: "2025-01-10T11:00:00Z" },
    ],
    "/var": [
      { name: "log", fullPath: "/var/log", isDirectory: true, size: 0, modified: "2025-05-24T06:00:00Z" },
      { name: "www", fullPath: "/var/www", isDirectory: true, size: 0, modified: "2024-12-01T00:00:00Z" },
    ],
    "/var/log": [
      { name: "syslog", fullPath: "/var/log/syslog", isDirectory: false, size: 1048576, modified: "2025-05-24T06:00:00Z" },
      { name: "auth.log", fullPath: "/var/log/auth.log", isDirectory: false, size: 524288, modified: "2025-05-24T05:30:00Z" },
    ],
    "/var/www": [
      { name: "public", fullPath: "/var/www/public", isDirectory: true, size: 0, modified: "2025-03-01T00:00:00Z" },
      { name: "index.php", fullPath: "/var/www/index.php", isDirectory: false, size: 4096, modified: "2025-03-01T00:00:00Z" },
    ],
    "/etc": [
      { name: "nginx", fullPath: "/etc/nginx", isDirectory: true, size: 0, modified: "2025-01-01T00:00:00Z" },
      { name: "ssh", fullPath: "/etc/ssh", isDirectory: true, size: 0, modified: "2024-06-01T00:00:00Z" },
      { name: "hosts", fullPath: "/etc/hosts", isDirectory: false, size: 128, modified: "2024-01-01T00:00:00Z" },
    ],
    "/tmp": [
      { name: "session.lock", fullPath: "/tmp/session.lock", isDirectory: false, size: 0, modified: "2025-05-24T07:00:00Z" },
    ],
    "/usr": [
      { name: "bin", fullPath: "/usr/bin", isDirectory: true, size: 0, modified: "2024-01-01T00:00:00Z" },
      { name: "lib", fullPath: "/usr/lib", isDirectory: true, size: 0, modified: "2024-01-01T00:00:00Z" },
      { name: "share", fullPath: "/usr/share", isDirectory: true, size: 0, modified: "2024-01-01T00:00:00Z" },
    ],
  };

  return mockFs[normalized] ?? [];
}
