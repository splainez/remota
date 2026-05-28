import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type LastPaths = Record<
	string,
	{
		local?: string;
		remote?: string;
	}
>;

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
				this.data = JSON.parse(raw) as LastPaths;
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
		return (this.data[String(connectionId)] as { local?: string } | undefined)?.local;
	}

	getRemotePath(connectionId: number): string | undefined {
		return (this.data[String(connectionId)] as { remote?: string } | undefined)?.remote;
	}

	setLocalPath(connectionId: number, path: string) {
		const key = String(connectionId);
		if (!(key in this.data)) {
			this.data[key] = {};
		}
		this.data[key].local = path;
		this.save();
	}

	setRemotePath(connectionId: number, path: string) {
		const key = String(connectionId);
		if (!(key in this.data)) {
			this.data[key] = {};
		}
		this.data[key].remote = path;
		this.save();
	}
}
