import { S3Client, ListObjectsV2Command, HeadBucketCommand } from "@aws-sdk/client-s3";
import { tempManager } from "@main/temp/temp-manager";
import type { FileEntry } from "@shared/types";

interface S3Session {
	client: S3Client;
	bucket: string;
	connectionId: number;
}

export class S3ConnectionManager {
	private sessions = new Map<number, S3Session>();

	async connect(
		connectionId: number,
		config: {
			accessKey: string;
			secretKey: string;
			region: string;
			bucket: string;
			host: string;
			port: number;
			endpoint?: string;
			useHttps: boolean;
		},
	): Promise<string> {
		if (this.sessions.has(connectionId)) {
			this.disconnect(connectionId);
		}

		const scheme = config.useHttps ? "https://" : "http://";

		let resolvedEndpoint: string | undefined;

		if (config.endpoint && config.endpoint.trim().length > 0) {
			const ep = config.endpoint.trim();
			if (ep.startsWith("http://") || ep.startsWith("https://")) {
				resolvedEndpoint = ep;
			} else {
				resolvedEndpoint = scheme + ep;
			}
		} else {
			resolvedEndpoint = `${scheme}${config.host}:${String(config.port)}`;
		}

		const clientConfig: {
			region: string;
			credentials: { accessKeyId: string; secretAccessKey: string };
			endpoint?: string;
			forcePathStyle: boolean;
		} = {
			region: config.region || "us-east-1",
			credentials: {
				accessKeyId: config.accessKey,
				secretAccessKey: config.secretKey,
			},
			forcePathStyle: true,
			endpoint: resolvedEndpoint,
		};

		const client = new S3Client(clientConfig);

		try {
			await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
		} catch (err) {
			client.destroy();
			const message = err instanceof Error ? err.message : String(err);
			throw new Error(`S3 connection error: ${message}, endpoint: ${resolvedEndpoint}`, { cause: err });
		}

		this.sessions.set(connectionId, {
			client,
			bucket: config.bucket,
			connectionId,
		});

		await tempManager.createTempDir(connectionId);

		return "/";
	}

	disconnect(connectionId: number): void {
		const session = this.sessions.get(connectionId);
		if (!session) return;
		session.client.destroy();
		this.sessions.delete(connectionId);
		void tempManager.removeTempDir(connectionId);
	}

	disconnectAll(): void {
		for (const [id] of this.sessions) {
			this.disconnect(id);
		}
	}

	isConnected(connectionId: number): boolean {
		return this.sessions.has(connectionId);
	}

	async listDirectory(connectionId: number, path: string): Promise<FileEntry[]> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}

		const prefix = path === "/" ? "" : `${path.replace(/^\//, "").replace(/\/$/, "")}/`;

		try {
			const entries: FileEntry[] = [];
			let continuationToken: string | undefined;

			do {
				const command = new ListObjectsV2Command({
					Bucket: session.bucket,
					Delimiter: "/",
					Prefix: prefix || undefined,
					ContinuationToken: continuationToken,
				});

				const response = await session.client.send(command);

				if (response.CommonPrefixes) {
					for (const cp of response.CommonPrefixes) {
						if (cp.Prefix) {
							const name = cp.Prefix.slice((prefix || "").length).replace(/\/$/, "");
							if (name.length > 0) {
								entries.push({
									name,
									fullPath: "/" + cp.Prefix.replace(/\/$/, ""),
									isDirectory: true,
									size: 0,
									modified: new Date().toISOString(),
								});
							}
						}
					}
				}

				if (response.Contents) {
					for (const obj of response.Contents) {
						if (!obj.Key) continue;
						const name = obj.Key.slice((prefix || "").length);
						if (name.length === 0) continue;
						entries.push({
							name,
							fullPath: "/" + obj.Key,
							isDirectory: false,
							size: obj.Size ?? 0,
							modified: obj.LastModified ? obj.LastModified.toISOString() : new Date().toISOString(),
						});
					}
				}

				continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
			} while (continuationToken);

			return entries;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			throw new Error(`S3 list error: ${message}`, { cause: err });
		}
	}

	homeDir(): string {
		return "/";
	}
}
