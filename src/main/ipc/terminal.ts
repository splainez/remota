import { ipcMain } from "electron";
import { IPC } from "../../shared/ipc-channels";
import type { TerminalManager } from "../terminal/terminal-manager";

export function registerTerminalHandlers(terminalManager: TerminalManager): void {
	ipcMain.handle(
		IPC.TERMINAL_SPAWN,
		(_event, sessionId: string, type: "local" | "remote", connectionId?: number) => {
			if (type === "local") {
				terminalManager.spawnLocal(sessionId);
			} else if (connectionId !== undefined) {
				void terminalManager.spawnRemote(sessionId, connectionId);
			}
		},
	);

	ipcMain.handle(IPC.TERMINAL_WRITE, (_event, sessionId: string, data: string) => {
		terminalManager.write(sessionId, data);
	});

	ipcMain.handle(
		IPC.TERMINAL_RESIZE,
		(_event, sessionId: string, cols: number, rows: number) => {
			terminalManager.resize(sessionId, cols, rows);
		},
	);

	ipcMain.handle(IPC.TERMINAL_KILL, (_event, sessionId: string) => {
		terminalManager.kill(sessionId);
	});
}
