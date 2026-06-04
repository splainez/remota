import { detectInstalledTerminals } from "@main/terminal/terminal-detector";
import type { TerminalManager } from "@main/terminal/terminal-manager";
import { IPC } from "@shared/ipc-channels";
import { ipcMain } from "electron";

export function registerTerminalHandlers(terminalManager: TerminalManager): void {
	ipcMain.handle(IPC.TERMINAL_SPAWN, (_event, sessionId: string, type: "local" | "remote", connectionId?: number) => {
		if (type === "local") {
			terminalManager.spawnLocal(sessionId);
		} else if (connectionId !== undefined) {
			terminalManager.spawnRemote(sessionId, connectionId).catch(() => {
				// spawnRemote failure already handled internally
			});
		}
	});

	ipcMain.handle(IPC.TERMINAL_WRITE, (_event, sessionId: string, data: string) => {
		terminalManager.write(sessionId, data);
	});

	ipcMain.handle(IPC.TERMINAL_RESIZE, (_event, sessionId: string, cols: number, rows: number) => {
		terminalManager.resize(sessionId, cols, rows);
	});

	ipcMain.handle(IPC.TERMINAL_KILL, (_event, sessionId: string) => {
		terminalManager.kill(sessionId);
	});

	ipcMain.handle(
		IPC.TERMINAL_OPEN_EXTERNAL,
		(_event, connectionId: number, path: string | undefined, type: "local" | "remote") => {
			return terminalManager.openExternalTerminal(connectionId, path, type);
		},
	);

	ipcMain.handle(IPC.TERMINAL_DETECT_INSTALLED, () => detectInstalledTerminals());
}
