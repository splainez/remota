import { Client, type SFTPWrapper, type ConnectConfig } from "ssh2";
import { readFileSync } from "node:fs";
import type { FileEntry } from "../../shared/types";

interface SftpSession {
  client: Client;
  sftp: SFTPWrapper;
  connectionId: number;
}

export class SftpConnectionManager {
  private sessions = new Map<number, SftpSession>();

  async connect(
    connectionId: number,
    config: {
      host: string;
      port: number;
      username: string;
      authType: "password" | "key" | "agent";
      password?: string;
      privateKeyPath?: string;
    },
  ): Promise<string> {
    if (this.sessions.has(connectionId)) {
      await this.disconnect(connectionId);
    }

    const client = new Client();

    const sshConfig: ConnectConfig = {
      host: config.host,
      port: config.port,
      username: config.username,
      readyTimeout: 10_000,
      keepaliveInterval: 30_000,
    };

    if (config.authType === "password") {
      sshConfig.password = config.password ?? "";
    } else if (config.authType === "key") {
      if (!config.privateKeyPath) {
        throw new Error("Private key path is required for key authentication");
      }
      const keyContent = readFileSync(config.privateKeyPath, "utf-8");
      sshConfig.privateKey = keyContent;
  } else {
    sshConfig.agent = process.env.SSH_AUTH_SOCK ?? undefined;
  }

    return new Promise<string>((resolve, reject) => {
      client.on("ready", () => {
        client.sftp((err, sftp) => {
          if (err) {
            client.end();
            reject(new Error(`SFTP subsystem error: ${err.message}`));
            return;
          }

          this.sessions.set(connectionId, { client, sftp, connectionId });

          sftp.realpath(".", (realpathErr, absPath) => {
            if (realpathErr) {
              resolve("/");
            } else {
              resolve(absPath);
            }
          });
        });
      });

      client.on("error", (err) => {
        reject(new Error(`SSH connection error: ${err.message}`));
      });

      client.connect(sshConfig);
    });
  }

  async disconnect(connectionId: number): Promise<void> {
    const session = this.sessions.get(connectionId);
    if (!session) return;

    return new Promise<void>((resolve) => {
      session.client.end();
      this.sessions.delete(connectionId);
      resolve();
    });
  }

  disconnectAll(): void {
    for (const [id] of this.sessions) {
      void this.disconnect(id);
    }
  }

  isConnected(connectionId: number): boolean {
    return this.sessions.has(connectionId);
  }

  async listDirectory(connectionId: number, path: string): Promise<FileEntry[]> {
    const session = this.sessions.get(connectionId);
    if (!session) {
      throw new Error("Not connected to remote server");
    }

    return new Promise<FileEntry[]>((resolve, reject) => {
      session.sftp.readdir(path, (err, list) => {
        if (err) {
          reject(new Error(`Failed to list directory: ${err.message}`));
          return;
        }

        const entries: FileEntry[] = list
          .filter((entry) => entry.filename !== "." && entry.filename !== "..")
          .map((entry) => ({
            name: entry.filename,
            fullPath: `${path}/${entry.filename}`,
            isDirectory: entry.attrs.isDirectory(),
            size: entry.attrs.size,
            modified: new Date(entry.attrs.mtime * 1000).toISOString(),
          }));

        resolve(entries);
      });
    });
  }

  async homeDir(connectionId: number): Promise<string> {
    const session = this.sessions.get(connectionId);
    if (!session) {
      throw new Error("Not connected to remote server");
    }

    return new Promise<string>((resolve) => {
      session.sftp.realpath(".", (err, absPath) => {
        resolve(err ? "/" : absPath);
      });
    });
  }
}
