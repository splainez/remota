import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { AppStore } from "./app-store";
import { IPC } from "../shared/ipc-channels";
import { registerConnectionHandlers } from "./ipc/connections";
import { registerFilesystemHandlers } from "./ipc/filesystem";
import { registerRemoteFilesystemHandlers } from "./ipc/remote-filesystem";
import { registerTerminalHandlers } from "./ipc/terminal";
import { registerSettingsHandlers } from "./ipc/settings";
import { TerminalManager } from "./terminal/terminal-manager";
import { SftpConnectionManager } from "./sftp/sftp-client";
import { S3ConnectionManager } from "./s3/s3-client";

let mainWindow: BrowserWindow | null = null;
let appStore: AppStore;

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

	const initialError = appStore.getLoadError();
	if (initialError) {
		mainWindow.webContents.on("did-finish-load", () => {
			mainWindow?.webContents.send("config-error", {
				message: initialError.message,
				filePath: initialError.filePath,
				issues: initialError.issues,
			});
		});
	}

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

void app.whenReady().then(() => {
	const userDataPath = app.getPath("userData");

	appStore = new AppStore(userDataPath);

	ipcMain.handle(IPC.APP_GET_CONFIG_PATH, () => {
		return appStore.getFilePath();
	});

	ipcMain.handle(IPC.APP_GET_CONFIG_ERROR, () => {
		appStore.reload();
		const err = appStore.getLoadError();
		if (!err) return null;
		return {
			message: err.message,
			filePath: err.filePath,
			issues: err.issues,
		};
	});

	const sftp = new SftpConnectionManager();
	const s3 = new S3ConnectionManager();
	registerConnectionHandlers(appStore);
	registerFilesystemHandlers(appStore);
	registerRemoteFilesystemHandlers(sftp, s3, appStore);
	registerSettingsHandlers(appStore);
	createWindow();

	if (!mainWindow) {
		throw new Error("Main window not created");
	}

	const terminalManager = new TerminalManager(sftp, mainWindow.webContents);
	registerTerminalHandlers(terminalManager);

	app.on("will-quit", () => {
		terminalManager.killAll();
		sftp.disconnectAll();
		s3.disconnectAll();
		appStore.flush();
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
