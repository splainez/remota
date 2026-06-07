import { join } from "node:path";

import { IPC } from "@shared/ipc-channels";
import { app, BrowserWindow, ipcMain } from "electron";

import { AppStore } from "./app-store";
import { FileWatcherManager } from "./file-watcher/file-watcher-manager";
import { registerConnectionHandlers } from "./ipc/connections";
import { registerFilePaneSizeHandlers } from "./ipc/file-pane-size";
import { registerFilesystemHandlers } from "./ipc/filesystem";
import { registerRemoteFilesystemHandlers } from "./ipc/remote-filesystem";
import { registerSettingsHandlers } from "./ipc/settings";
import { registerTerminalHandlers } from "./ipc/terminal";
import { registerTransferHandlers } from "./ipc/transfer";
import { registerTransferPanelHandlers } from "./ipc/transfer-panel";
import { S3ConnectionManager } from "./s3/s3-client";
import { SftpConnectionManager } from "./sftp/sftp-client";
import { tempManager } from "./temp/temp-manager";
import { TerminalManager } from "./terminal/terminal-manager";
import { TransferService } from "./transfer/transfer-service";

let mainWindow: BrowserWindow | null = null;
let appStore: AppStore;
let transferService: TransferService;

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
	registerRemoteFilesystemHandlers(sftp, s3, appStore);
	registerTransferPanelHandlers(appStore);
	registerFilePaneSizeHandlers(appStore);
	createWindow();

	if (!mainWindow) {
		throw new Error("Main window not created");
	}

	mainWindow.on("close", (event) => {
		if (transferService.hasActiveTransfers()) {
			event.preventDefault();
			mainWindow?.webContents.send(IPC.APP_CONFIRM_QUIT);
		}
	});

	ipcMain.on(IPC.APP_QUIT_RESPONSE, (_event, proceed: boolean) => {
		if (proceed) {
			mainWindow?.destroy();
		}
	});

	const fileWatcher = new FileWatcherManager(mainWindow.webContents);
	registerFilesystemHandlers(appStore, fileWatcher);
	const terminalManager = new TerminalManager(sftp, appStore, mainWindow.webContents);
	registerTerminalHandlers(terminalManager);

	transferService = new TransferService({ sftp, s3, store: appStore });
	registerSettingsHandlers(appStore, transferService);
	registerTransferHandlers(transferService, () => mainWindow?.webContents ?? null);

	app.on("will-quit", () => {
		fileWatcher.stopAll();
		terminalManager.killAll();
		transferService.cancelAll();
		sftp.disconnectAll();
		s3.disconnectAll();
		void tempManager.removeAll();
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
