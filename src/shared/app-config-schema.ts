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

export const AppConfigSchema = z
	.object({
		connections: z.array(ConnectionSchema).default([]),
		lastPaths: LastPathsSchema.default({}),
		settings: z.record(z.string(), z.unknown()).default({}),
	})
	.strict();

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type AppConfigInput = z.input<typeof AppConfigSchema>;
