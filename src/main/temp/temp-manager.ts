import { mkdtemp, rm, mkdir, writeFile, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";

export class TempManager {
	private tempDirs = new Map<number, string>();

	async createTempDir(connectionId: number): Promise<string> {
		const existing = this.tempDirs.get(connectionId);
		if (existing) {
			return existing;
		}

		const dir = await mkdtemp(join(tmpdir(), `openscp-${String(connectionId)}-`));
		this.tempDirs.set(connectionId, dir);
		return dir;
	}

	async removeTempDir(connectionId: number): Promise<void> {
		const dir = this.tempDirs.get(connectionId);
		if (!dir) return;

		try {
			await rm(dir, { recursive: true, force: true });
		} catch {
			// Ignore errors during cleanup
		}

		this.tempDirs.delete(connectionId);
	}

	async removeAll(): Promise<void> {
		const ids = [...this.tempDirs.keys()];
		for (const id of ids) {
			await this.removeTempDir(id);
		}
	}

	getTempPath(connectionId: number): string | undefined {
		return this.tempDirs.get(connectionId);
	}

	private resolveTempPath(connectionId: number, remotePath: string): string {
		const tempDir = this.tempDirs.get(connectionId);
		if (!tempDir) {
			throw new Error(`No temp dir for connection ${String(connectionId)}`);
		}

		const relativePath = remotePath.startsWith("/") ? remotePath.slice(1) : remotePath;
		const fullPath = resolve(tempDir, relativePath);

		if (!fullPath.startsWith(tempDir)) {
			throw new Error("Path traversal detected");
		}

		return fullPath;
	}

	async ensureDir(connectionId: number, remotePath: string): Promise<void> {
		const fullPath = this.resolveTempPath(connectionId, remotePath);
		await mkdir(fullPath, { recursive: true });
	}

	async writeFile(connectionId: number, remotePath: string, content: Buffer): Promise<void> {
		const fullPath = this.resolveTempPath(connectionId, remotePath);
		const parentDir = dirname(fullPath);
		await mkdir(parentDir, { recursive: true });
		await writeFile(fullPath, content);
	}

	async readFile(connectionId: number, remotePath: string): Promise<Buffer> {
		const fullPath = this.resolveTempPath(connectionId, remotePath);
		return readFile(fullPath);
	}

	async deletePath(connectionId: number, remotePath: string): Promise<void> {
		const fullPath = this.resolveTempPath(connectionId, remotePath);
		await rm(fullPath, { recursive: true, force: true });
	}

	async exists(connectionId: number, remotePath: string): Promise<boolean> {
		try {
			const fullPath = this.resolveTempPath(connectionId, remotePath);
			await access(fullPath);
			return true;
		} catch {
			return false;
		}
	}
}

export const tempManager = new TempManager();
