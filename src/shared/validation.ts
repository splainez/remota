import { z } from "zod";

const protocols = ["sftp", "scp", "s3"] as const;
export const authTypes = ["password", "key", "agent"] as const;

export const DEFAULT_PORT: Record<string, number> = { sftp: 22, scp: 22, s3: 443 };

const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const ipv4Regex = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
function isValidIPv6(val: string): boolean {
	if (/^[0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){7}$/.test(val)) return true;
	const parts = val.split("::");
	if (parts.length !== 2) return false;
	const [left, right] = parts;
	const leftCount = left ? left.split(":").filter(Boolean).length : 0;
	const rightCount = right ? right.split(":").filter(Boolean).length : 0;
	if (leftCount + rightCount > 7) return false;
	const groupRe = /^[0-9a-fA-F]{1,4}$/;
	const allGroups = [...(left ? left.split(":") : []), ...(right ? right.split(":") : [])].filter(Boolean);
	return allGroups.every((g) => groupRe.test(g));
}

function isValidHostAddress(val: string): boolean {
	return hostnameRegex.test(val) || ipv4Regex.test(val) || isValidIPv6(val);
}

export const hostSchema = z.string().superRefine((val, ctx) => {
	if (val.trim().length === 0) {
		ctx.addIssue({ code: "custom", message: "validation.hostRequired" });
		return;
	}
	if (!isValidHostAddress(val.trim())) {
		ctx.addIssue({ code: "custom", message: "validation.hostInvalid" });
	}
});

export const portSchema = z.number().int("validation.portInteger").min(1, "validation.portMin").max(65535, "validation.portMax");
export const usernameSchema = z.string().trim().min(1, "validation.usernameRequired");
export const passwordSchema = z.string().min(1, "validation.passwordRequired");
export const privateKeyPathSchema = z.string().min(1, "validation.privateKeyRequired");
export const nameSchema = z.string().trim().min(1, "validation.nameRequired");
export const accessKeySchema = z.string().trim().min(1, "validation.accessKeyRequired");
export const secretKeySchema = z.string().trim().min(1, "validation.secretKeyRequired");
export const regionSchema = z.string().trim().min(1, "validation.regionRequired");
export const bucketSchema = z.string().trim().min(1, "validation.bucketRequired");

export const connectionBaseSchema = z.object({
	name: nameSchema,
	protocol: z.enum(protocols),
	host: hostSchema,
	port: portSchema,
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
});

export const connectionFormSchema = connectionBaseSchema.refine(
	(data) => data.protocol === "s3" || data.authType !== "password" || data.password.trim().length > 0,
	{ message: "validation.passwordRequired", path: ["password"] },
).refine(
	(data) => data.protocol === "s3" || data.authType !== "key" || data.privateKeyPath.trim().length > 0,
	{ message: "validation.privateKeyRequired", path: ["privateKeyPath"] },
).refine(
	(data) => data.protocol === "s3" || data.username.trim().length > 0,
	{ message: "validation.usernameRequired", path: ["username"] },
).refine(
	(data) => data.protocol !== "s3" || data.accessKey.trim().length > 0,
	{ message: "validation.accessKeyRequired", path: ["accessKey"] },
).refine(
	(data) => data.protocol !== "s3" || data.secretKey.trim().length > 0,
	{ message: "validation.secretKeyRequired", path: ["secretKey"] },
).refine(
	(data) => data.protocol !== "s3" || data.region.trim().length > 0,
	{ message: "validation.regionRequired", path: ["region"] },
).refine(
	(data) => data.protocol !== "s3" || data.bucket.trim().length > 0,
	{ message: "validation.bucketRequired", path: ["bucket"] },
);

export type ConnectionFormData = z.infer<typeof connectionFormSchema>;
