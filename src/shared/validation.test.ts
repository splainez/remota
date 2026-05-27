import { describe, it, expect } from "vitest";
import { hostSchema, portSchema, usernameSchema, nameSchema, passwordSchema, privateKeyPathSchema, connectionFormSchema, DEFAULT_PORT } from "./validation";

describe("hostSchema", () => {
	it("rejects empty string", () => {
		const result = hostSchema.safeParse("");
		expect(result.success).toBe(false);
	});

	it("rejects whitespace-only string", () => {
		const result = hostSchema.safeParse("   ");
		expect(result.success).toBe(false);
	});

	it("rejects string with only a dot", () => {
		const result = hostSchema.safeParse(".");
		expect(result.success).toBe(false);
	});

	it("rejects string starting with hyphen", () => {
		const result = hostSchema.safeParse("-invalid");
		expect(result.success).toBe(false);
	});

	it("rejects string with spaces", () => {
		const result = hostSchema.safeParse("host name");
		expect(result.success).toBe(false);
	});

	it("accepts hostname localhost", () => {
		const result = hostSchema.safeParse("localhost");
		expect(result.success).toBe(true);
	});

	it("accepts single-word hostname", () => {
		const result = hostSchema.safeParse("myhost");
		expect(result.success).toBe(true);
	});

	it("accepts hostname with hyphen", () => {
		const result = hostSchema.safeParse("my-host");
		expect(result.success).toBe(true);
	});

	it("accepts domain name", () => {
		const result = hostSchema.safeParse("example.com");
		expect(result.success).toBe(true);
	});

	it("accepts subdomain", () => {
		const result = hostSchema.safeParse("ftp.example.com");
		expect(result.success).toBe(true);
	});

	it("accepts domain with hyphen", () => {
		const result = hostSchema.safeParse("my-host.example.com");
		expect(result.success).toBe(true);
	});

	it("accepts .local domain", () => {
		const result = hostSchema.safeParse("raspberrypi.local");
		expect(result.success).toBe(true);
	});

	it("accepts IPv4 address", () => {
		const result = hostSchema.safeParse("192.168.1.1");
		expect(result.success).toBe(true);
	});

	it("accepts IPv4 localhost", () => {
		const result = hostSchema.safeParse("127.0.0.1");
		expect(result.success).toBe(true);
	});

	it("accepts full IPv6 address", () => {
		const result = hostSchema.safeParse("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
		expect(result.success).toBe(true);
	});

	it("accepts compressed IPv6 address", () => {
		const result = hostSchema.safeParse("2001:db8::1");
		expect(result.success).toBe(true);
	});

	it("accepts IPv6 localhost", () => {
		const result = hostSchema.safeParse("::1");
		expect(result.success).toBe(true);
	});

	it("rejects IPv6 with too many groups", () => {
		// 14 groups — invalid
		const result = hostSchema.safeParse("1:2:3:4:5:6::7:8:9:a:b:c");
		expect(result.success).toBe(false);
	});
});

describe("portSchema", () => {
	it("accepts valid port", () => {
		expect(portSchema.safeParse(22).success).toBe(true);
	});

	it("rejects 0", () => {
		expect(portSchema.safeParse(0).success).toBe(false);
	});

	it("rejects negative numbers", () => {
		expect(portSchema.safeParse(-1).success).toBe(false);
	});

	it("rejects numbers above 65535", () => {
		expect(portSchema.safeParse(65536).success).toBe(false);
	});

	it("accepts port 1", () => {
		expect(portSchema.safeParse(1).success).toBe(true);
	});

	it("accepts port 65535", () => {
		expect(portSchema.safeParse(65535).success).toBe(true);
	});

	it("rejects floats", () => {
		expect(portSchema.safeParse(22.5).success).toBe(false);
	});
});

describe("usernameSchema", () => {
	it("rejects empty string", () => {
		const result = usernameSchema.safeParse("");
		expect(result.success).toBe(false);
	});

	it("rejects whitespace-only username", () => {
		const result = usernameSchema.safeParse("   ");
		expect(result.success).toBe(false);
	});

	it("trims leading/trailing whitespace", () => {
		const result = usernameSchema.safeParse("  admin  ");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("admin");
		}
	});

	it("accepts non-empty username", () => {
		const result = usernameSchema.safeParse("admin");
		expect(result.success).toBe(true);
	});
});

describe("nameSchema", () => {
	it("rejects empty string", () => {
		expect(nameSchema.safeParse("").success).toBe(false);
	});

	it("rejects whitespace-only string", () => {
		expect(nameSchema.safeParse("   ").success).toBe(false);
	});

	it("accepts non-empty name", () => {
		expect(nameSchema.safeParse("My Server").success).toBe(true);
	});

	it("trims leading/trailing whitespace", () => {
		const result = nameSchema.safeParse("  My Server  ");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("My Server");
		}
	});
});

describe("passwordSchema", () => {
	it("rejects empty string", () => {
		expect(passwordSchema.safeParse("").success).toBe(false);
	});

	it("accepts non-empty password", () => {
		expect(passwordSchema.safeParse("secret").success).toBe(true);
	});
});

describe("privateKeyPathSchema", () => {
	it("rejects empty string", () => {
		expect(privateKeyPathSchema.safeParse("").success).toBe(false);
	});

	it("accepts non-empty path", () => {
		expect(privateKeyPathSchema.safeParse("~/.ssh/id_rsa").success).toBe(true);
	});
});

describe("connectionFormSchema", () => {
	const validBase = {
		name: "My Server",
		protocol: "sftp" as const,
		host: "example.com",
		port: 22,
		username: "admin",
		authType: "password" as const,
		password: "secret",
		privateKeyPath: "",
		accessKey: "",
		secretKey: "",
		region: "us-east-1",
		bucket: "",
		endpoint: "",
		useHttps: true,
		groupName: "",
	};

	it("accepts valid password auth data", () => {
		const result = connectionFormSchema.safeParse(validBase);
		expect(result.success).toBe(true);
	});

	it("accepts valid key auth data", () => {
		const result = connectionFormSchema.safeParse({
			...validBase,
			authType: "key" as const,
			password: "",
			privateKeyPath: "/home/user/.ssh/id_rsa",
		});
		expect(result.success).toBe(true);
	});

	it("rejects password auth without password", () => {
		const result = connectionFormSchema.safeParse({
			...validBase,
			password: "",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path.includes("password"))).toBe(true);
		}
	});

	it("rejects password auth with whitespace-only password", () => {
		const result = connectionFormSchema.safeParse({
			...validBase,
			password: "   ",
		});
		expect(result.success).toBe(false);
	});

	it("rejects key auth without privateKeyPath", () => {
		const result = connectionFormSchema.safeParse({
			...validBase,
			authType: "key" as const,
			password: "",
			privateKeyPath: "",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path.includes("privateKeyPath"))).toBe(true);
		}
	});

	it("rejects key auth with whitespace-only key path", () => {
		const result = connectionFormSchema.safeParse({
			...validBase,
			authType: "key" as const,
			password: "",
			privateKeyPath: "   ",
		});
		expect(result.success).toBe(false);
	});

	it("does not require password when auth is key", () => {
		const result = connectionFormSchema.safeParse({
			...validBase,
			authType: "key" as const,
			password: "",
			privateKeyPath: "/path/to/key",
		});
		expect(result.success).toBe(true);
	});

	it("does not require privateKeyPath when auth is password", () => {
		const result = connectionFormSchema.safeParse({
			...validBase,
			privateKeyPath: "",
		});
		expect(result.success).toBe(true);
	});

	it("does not require password or key when auth is agent", () => {
		const result = connectionFormSchema.safeParse({
			...validBase,
			authType: "agent" as const,
			password: "",
			privateKeyPath: "",
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing host", () => {
		const result = connectionFormSchema.safeParse({ ...validBase, host: "" });
		expect(result.success).toBe(false);
	});

	it("rejects invalid host format", () => {
		const result = connectionFormSchema.safeParse({ ...validBase, host: "-invalid" });
		expect(result.success).toBe(false);
	});

	it("rejects missing username", () => {
		const result = connectionFormSchema.safeParse({ ...validBase, username: "" });
		expect(result.success).toBe(false);
	});

	it("rejects invalid port", () => {
		const result = connectionFormSchema.safeParse({ ...validBase, port: 0 });
		expect(result.success).toBe(false);
	});

	it("rejects invalid protocol", () => {
		const result = connectionFormSchema.safeParse({ ...validBase, protocol: "ftp" });
		expect(result.success).toBe(false);
	});

	it("rejects empty name", () => {
		const result = connectionFormSchema.safeParse({ ...validBase, name: "" });
		expect(result.success).toBe(false);
	});

	it("rejects whitespace-only name", () => {
		const result = connectionFormSchema.safeParse({ ...validBase, name: "   " });
		expect(result.success).toBe(false);
	});

	it("rejects S3 protocol without access key", () => {
		const result = connectionFormSchema.safeParse({
			...validBase,
			protocol: "s3" as const,
			accessKey: "",
			secretKey: "sk",
			region: "us-east-1",
			bucket: "my-bucket",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path.includes("accessKey"))).toBe(true);
		}
	});

	it("rejects S3 protocol without secret key", () => {
		const result = connectionFormSchema.safeParse({
			...validBase,
			protocol: "s3" as const,
			accessKey: "ak",
			secretKey: "",
			region: "us-east-1",
			bucket: "my-bucket",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path.includes("secretKey"))).toBe(true);
		}
	});

	it("rejects S3 protocol without region", () => {
		const result = connectionFormSchema.safeParse({
			...validBase,
			protocol: "s3" as const,
			accessKey: "ak",
			secretKey: "sk",
			region: "",
			bucket: "my-bucket",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path.includes("region"))).toBe(true);
		}
	});

	it("rejects S3 protocol without bucket", () => {
		const result = connectionFormSchema.safeParse({
			...validBase,
			protocol: "s3" as const,
			accessKey: "ak",
			secretKey: "sk",
			region: "us-east-1",
			bucket: "",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path.includes("bucket"))).toBe(true);
		}
	});

	it("accepts valid S3 data", () => {
		const result = connectionFormSchema.safeParse({
			...validBase,
			protocol: "s3" as const,
			accessKey: "AKIATEST",
			secretKey: "secret123",
			region: "eu-west-1",
			bucket: "my-bucket",
			endpoint: "",
			useHttps: true,
		});
		expect(result.success).toBe(true);
	});

	it("accepts S3 with custom endpoint", () => {
		const result = connectionFormSchema.safeParse({
			...validBase,
			protocol: "s3" as const,
			accessKey: "AKIATEST",
			secretKey: "secret123",
			region: "us-east-1",
			bucket: "my-bucket",
			endpoint: "http://localhost:9000",
			useHttps: false,
		});
		expect(result.success).toBe(true);
	});
});

describe("DEFAULT_PORT", () => {
	it("has 22 for sftp", () => {
		expect(DEFAULT_PORT.sftp).toBe(22);
	});

	it("has 22 for scp", () => {
		expect(DEFAULT_PORT.scp).toBe(22);
	});

	it("has 443 for s3", () => {
		expect(DEFAULT_PORT.s3).toBe(443);
	});
});
