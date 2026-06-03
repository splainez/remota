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

export const SettingsSchema = z.object({
	theme: z.enum(["dark", "light", "system"]),
	locale: z.enum(["en", "es"]),
	externalTerminal: z.enum(TERMINAL_APP_IDS).optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type SettingsUpdate = Partial<Settings>;

const defaultSettings: Settings = { theme: "system", locale: "en" };

export const AppConfigSchema = z
	.object({
		connections: z.array(ConnectionSchema).default([]),
		lastPaths: LastPathsSchema.default({}),
		transferPanels: TransferPanelsSchema.default({}),
		settings: SettingsSchema.default(defaultSettings),
	})
	.strict();

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type AppConfigInput = z.input<typeof AppConfigSchema>;
