import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface LastPaths {
  [connectionId: string]: {
    local?: string;
    remote?: string;
  };
}

export class LastPathStore {
  private filePath: string;
  private data: LastPaths = {};
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(userDataPath: string) {
    mkdirSync(userDataPath, { recursive: true });
    this.filePath = join(userDataPath, "last-paths.json");
    this.load();
  }

  private load() {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, "utf-8");
        this.data = JSON.parse(raw);
      }
    } catch {
      this.data = {};
    }
  }

  private save() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      try {
        writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
      } catch {
        // silently ignore write failures
      }
    }, 500);
  }

  getLocalPath(connectionId: number): string | undefined {
    return this.data[String(connectionId)]?.local;
  }

  getRemotePath(connectionId: number): string | undefined {
    return this.data[String(connectionId)]?.remote;
  }

  setLocalPath(connectionId: number, path: string) {
    const key = String(connectionId);
    if (!this.data[key]) {
      this.data[key] = {};
    }
    this.data[key].local = path;
    this.save();
  }

  setRemotePath(connectionId: number, path: string) {
    const key = String(connectionId);
    if (!this.data[key]) {
      this.data[key] = {};
    }
    this.data[key].remote = path;
    this.save();
  }
}
