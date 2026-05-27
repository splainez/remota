import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { initDatabase } from "./database";
import { registerConnectionHandlers } from "./ipc/connections";
import { registerFilesystemHandlers } from "./ipc/filesystem";
import { registerRemoteFilesystemHandlers } from "./ipc/remote-filesystem";
import { registerTerminalHandlers } from "./ipc/terminal";
import { TerminalManager } from "./terminal/terminal-manager";
import { LastPathStore } from "./last-path-store";
import { SftpConnectionManager } from "./sftp/sftp-client";
import { S3ConnectionManager } from "./s3/s3-client";

let mainWindow: BrowserWindow | null = null;
let lastPathStore: LastPathStore;
let terminalManager: TerminalManager;

export function getLastPathStore(): LastPathStore {
	return lastPathStore;
}

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		minWidth: 900,
		minHeight: 600,
		title: "OpenSCP",
		webPreferences: {
			preload: join(__dirname, "../preload/index.mjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
		},
	});

	if (process.env.NODE_ENV === "development" || process.env.ELECTRON_RENDERER_URL) {
		void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL ?? "");
		mainWindow.webContents.openDevTools();
	} else {
		void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
	}

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

void app.whenReady().then(async () => {
	const userDataPath = app.getPath("userData");
	const db = await initDatabase(userDataPath);
	lastPathStore = new LastPathStore(userDataPath);
	const sftp = new SftpConnectionManager();
	const s3 = new S3ConnectionManager();
	registerConnectionHandlers(db);
	registerFilesystemHandlers(lastPathStore);
	registerRemoteFilesystemHandlers(sftp, s3, db);
	createWindow();

	if (!mainWindow) {
		throw new Error("Main window not created");
	}

	terminalManager = new TerminalManager(sftp, mainWindow.webContents);
	registerTerminalHandlers(terminalManager);

	app.on("will-quit", () => {
		terminalManager.killAll();
		sftp.disconnectAll();
		s3.disconnectAll();
	});

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
