import { useCallback, useEffect, useRef, useState } from "react";
import type { FileEntry } from "../../shared/types";
import { classifyError, type SftpErrorInfo } from "../../shared/sftp-error";

interface UseFileListOptions {
  type?: "local" | "remote";
  connectionId?: number;
}

export interface UseFileListResult {
  entries: FileEntry[];
  loading: boolean;
  error: SftpErrorInfo | null;
  refresh: () => Promise<void>;
}

export function useFileList(path: string, opts: UseFileListOptions = {}): UseFileListResult {
  const { type = "local", connectionId } = opts;
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<SftpErrorInfo | null>(null);
  const loadIdRef = useRef(0);

  const load = useCallback(async () => {
    const loadId = ++loadIdRef.current;
    setLoading(true);
    setError(null);
    try {
      let result: FileEntry[];
      if (type === "remote" && connectionId !== undefined) {
        result = await window.api.filesystem.remoteList(connectionId, path);
      } else {
        result = await window.api.filesystem.list(path);
      }
      if (loadId === loadIdRef.current) {
        setEntries(result);
        setLoading(false);
      }
    } catch (err) {
      if (loadId === loadIdRef.current) {
        setError(classifyError(err));
        setEntries([]);
        setLoading(false);
      }
    }
  }, [path, type, connectionId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { entries, loading, error, refresh: load };
}
