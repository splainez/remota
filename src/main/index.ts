import { existsSync } from "node:fs";
import { extname, join } from "node:path";

import { IPC } from "@shared/ipc-channels";
import { app, BrowserWindow, ipcMain, Menu } from "electron";

import { AppStore } from "./app-store";
import { FileWatcherManager } from "./file-watcher/file-watcher-manager";
import { registerConnectionHandlers } from "./ipc/connections";
import { registerFileColumnsHandlers } from "./ipc/file-columns";
import { registerFilePaneSizeHandlers } from "./ipc/file-pane-size";
import { registerFilesystemHandlers } from "./ipc/filesystem";
import { registerRemoteEditHandlers } from "./ipc/remote-edit";
import { registerRemoteFilesystemHandlers } from "./ipc/remote-filesystem";
import { registerSettingsHandlers } from "./ipc/settings";
import { registerTerminalHandlers } from "./ipc/terminal";
import { registerTransferHandlers } from "./ipc/transfer";
import { registerTransferPanelHandlers } from "./ipc/transfer-panel";
import { updateJumpList } from "./jump-list";
import { RemoteEditManager } from "./remote-edit/remote-edit-manager";
import { S3ConnectionManager } from "./s3/s3-client";
import { SftpConnectionManager } from "./sftp/sftp-client";
import { tempManager } from "./temp/temp-manager";
import { TerminalManager } from "./terminal/terminal-manager";
import { TransferService } from "./transfer/transfer-service";

let mainWindow: BrowserWindow | null = null;
let appStore: AppStore;
let transferService: TransferService;
let remoteEditManager: RemoteEditManager;

let pendingConnectionId: number | null = null;

function resolveRealExePath(): string {
	const argv0 = process.argv[0];
	if (argv0 && !argv0.includes(".asar") && extname(argv0.toLowerCase()) === ".exe" && existsSync(argv0)) {
		return argv0;
	}
	const saved = appStore.getExePath();
	if (saved && existsSync(saved)) return saved;
	return argv0;
}

function getAppIconPath(): string {
	if (app.isPackaged) {
		return join(process.resourcesPath, isLinux ? "icon.png" : "icon.ico");
	}
	return join(__dirname, isLinux ? "../src/main/assets/icon.png" : "../src/main/assets/icon.ico");
}

function parseConnectArgv(argv: string[]): number | null {
	for (const arg of argv) {
		const match = /^--connect=(\d+)$/.exec(arg);
		if (match) return Number(match[1]);
	}
	return null;
}

const isMac = process.platform === "darwin";
const isWindows = process.platform === "win32";
const isLinux = process.platform === "linux";

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		minWidth: 900,
		minHeight: 600,
		title: "Remota",
		icon: getAppIconPath(),
		frame: isLinux ? false : true,
		trafficLightPosition: isMac ? { x: 12, y: 10 } : undefined,
		titleBarStyle: isMac ? "hiddenInset" : isWindows ? "hidden" : undefined,
		webPreferences: {
			preload: join(__dirname, "../preload/index.mjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
		},
	});

	// if (maximized) {
	mainWindow.maximize();
	// }

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

function sendOpenConnection(connectionId: number) {
	if (mainWindow) {
		if (mainWindow.isMinimized()) mainWindow.restore();
		mainWindow.focus();
		mainWindow.webContents.send(IPC.APP_OPEN_CONNECTION, connectionId);
	}
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	app.quit();
} else {
	app.on("second-instance", (_event, commandLine) => {
		const id = parseConnectArgv(commandLine);
		if (id != null) {
			sendOpenConnection(id);
		}
	});

	void app.whenReady().then(() => {
		Menu.setApplicationMenu(null);

		const userDataPath = app.getPath("userData");

		appStore = new AppStore(userDataPath);

		if (!appStore.getExePath()) {
			appStore.setExePath(resolveRealExePath());
		}

		updateJumpList(appStore);

		ipcMain.handle(IPC.APP_GET_CONFIG_PATH, () => {
			return appStore.getFilePath();
		});

		ipcMain.handle(IPC.APP_GET_PENDING_CONNECTION, () => {
			const id = pendingConnectionId;
			pendingConnectionId = null;
			return id;
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
		registerFileColumnsHandlers(appStore);
		createWindow();

		if (!mainWindow) {
			throw new Error("Main window not created");
		}

		const initialConnectId = parseConnectArgv(process.argv);
		if (initialConnectId != null) {
			pendingConnectionId = initialConnectId;
		}

		ipcMain.handle(IPC.WINDOW_MINIMIZE, () => {
			mainWindow?.minimize();
		});

		ipcMain.handle(IPC.WINDOW_MAXIMIZE, () => {
			if (mainWindow?.isMaximized()) {
				mainWindow.unmaximize();
			} else {
				mainWindow?.maximize();
			}
		});

		ipcMain.handle(IPC.WINDOW_CLOSE, () => {
			mainWindow?.close();
		});

		ipcMain.handle(IPC.WINDOW_IS_MAXIMIZED, () => {
			return mainWindow?.isMaximized() ?? false;
		});

		const sendMaximizeState = () => {
			mainWindow?.webContents.send(IPC.WINDOW_MAXIMIZE_CHANGE, mainWindow.isMaximized());
		};

		mainWindow.on("maximize", sendMaximizeState);
		mainWindow.on("unmaximize", sendMaximizeState);

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

		remoteEditManager = new RemoteEditManager({
			sftp,
			s3,
			tempManager,
			getWebContents: () => mainWindow?.webContents ?? null,
		});
		registerTransferHandlers(transferService, () => mainWindow?.webContents ?? null, remoteEditManager);
		registerRemoteEditHandlers(remoteEditManager);

		app.on("will-quit", () => {
			fileWatcher.stopAll();
			terminalManager.killAll();
			transferService.cancelAll();
			remoteEditManager.stopAll();
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
}

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
