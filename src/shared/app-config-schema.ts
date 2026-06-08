import { z } from "zod";

const protocols = ["sftp", "scp", "s3"] as const;
const authTypes = ["password", "key", "agent"] as const;

export const ConnectionSchema = z.object({
	id: z.number(),
	name: z.string(),
	protocol: z.enum(protocols),
	host: z.string(),
	port: z.number(),
	username: z.string(),
	authType: z.enum(authTypes),
	password: z.string(),
	privateKeyPath: z.string(),
	accessKey: z.string(),
	secretKey: z.string(),
	region: z.string(),
	bucket: z.string(),
	endpoint: z.string(),
	useHttps: z.boolean(),
	groupName: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

const lastPathEntry = z.object({
	local: z.string().optional(),
	remote: z.string().optional(),
});

export const LastPathsSchema = z.record(z.string(), lastPathEntry);

export const TERMINAL_APP_IDS = [
	"windows-terminal",
	"kitty",
	"ghostty",
	"alacritty",
	"iterm2",
	"terminal-app",
	"gnome-terminal",
	"konsole",
] as const;

export type TerminalAppId = (typeof TERMINAL_APP_IDS)[number];

const transferPanelEntry = z.object({
	visible: z.boolean(),
});

export const TransferPanelsSchema = z.record(z.string(), transferPanelEntry);

export const TransferPanelUpdate = transferPanelEntry.partial();
export type TransferPanelUpdate = z.infer<typeof TransferPanelUpdate>;

const filePaneSizeEntry = z.object({
	localSize: z.number().min(10).max(90),
});

export const FilePaneSizesSchema = z.record(z.string(), filePaneSizeEntry);

export const FilePaneSizeUpdate = filePaneSizeEntry.partial();
export type FilePaneSizeUpdate = z.infer<typeof FilePaneSizeUpdate>;

export const MAX_PARALLEL_TRANSFERS_MIN = 1;
export const MAX_PARALLEL_TRANSFERS_MAX = 20;
export const MAX_PARALLEL_TRANSFERS_DEFAULT = 5;

export const MAX_SESSIONS_MIN = 1;
export const MAX_SESSIONS_MAX = 100;
export const MAX_SESSIONS_DEFAULT = 10;

export const RETENTION_MS_MIN = 5_000;
export const RETENTION_MS_MAX = 300_000;

export const REMOTE_DOUBLE_CLICK_ACTIONS = ["open", "edit"] as const;
export type RemoteDoubleClickAction = (typeof REMOTE_DOUBLE_CLICK_ACTIONS)[number];

export const SettingsSchema = z.object({
	theme: z.enum(["dark", "light", "system"]),
	locale: z.enum(["en", "es"]),
	externalTerminal: z.enum(TERMINAL_APP_IDS).optional(),
	maxParallelTransfers: z
		.number()
		.int()
		.min(MAX_PARALLEL_TRANSFERS_MIN)
		.max(MAX_PARALLEL_TRANSFERS_MAX)
		.default(MAX_PARALLEL_TRANSFERS_DEFAULT),
	maxSessions: z.number().int().min(MAX_SESSIONS_MIN).max(MAX_SESSIONS_MAX).default(MAX_SESSIONS_DEFAULT),
	retentionMs: z.number().int().min(RETENTION_MS_MIN).max(RETENTION_MS_MAX).optional(),
	remoteDoubleClickAction: z.enum(REMOTE_DOUBLE_CLICK_ACTIONS).default("open"),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type SettingsUpdate = Partial<Settings>;

const defaultSettings: Settings = {
	theme: "system",
	locale: "en",
	maxParallelTransfers: MAX_PARALLEL_TRANSFERS_DEFAULT,
	maxSessions: MAX_SESSIONS_DEFAULT,
	retentionMs: RETENTION_MS_MIN,
	remoteDoubleClickAction: "open",
};

export const AppConfigSchema = z
	.object({
		connections: z.array(ConnectionSchema).default([]),
		lastPaths: LastPathsSchema.default({}),
		transferPanels: TransferPanelsSchema.default({}),
		filePaneSizes: FilePaneSizesSchema.default({}),
		settings: SettingsSchema.default(defaultSettings),
	})
	.strict();

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type AppConfigInput = z.input<typeof AppConfigSchema>;
