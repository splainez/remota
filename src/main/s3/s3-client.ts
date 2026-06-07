import { createWriteStream, createReadStream } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import {
	S3Client,
	GetObjectCommand,
	ListObjectsV2Command,
	HeadBucketCommand,
	HeadObjectCommand,
	PutObjectCommand,
	DeleteObjectCommand,
	DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { tempManager } from "@main/temp/temp-manager";
import type { FileEntry, RemoteStat } from "@shared/types";

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
			return this.homeDir();
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

	async deletePath(connectionId: number, remotePath: string): Promise<void> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}

		const key = remotePath.replace(/^\/+/, "");
		if (key.length === 0) {
			throw new Error("Cannot delete S3 bucket root");
		}

		const isDir = remotePath.endsWith("/");
		if (!isDir) {
			try {
				await session.client.send(new DeleteObjectCommand({ Bucket: session.bucket, Key: key }));
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				throw new Error(`S3 delete error: ${message}`, { cause: err });
			}
			return;
		}

		let continuationToken: string | undefined;
		const objectsToDelete: { Key: string }[] = [];

		do {
			const listResponse = await session.client.send(
				new ListObjectsV2Command({
					Bucket: session.bucket,
					Prefix: key,
					ContinuationToken: continuationToken,
				}),
			);

			if (listResponse.Contents) {
				for (const obj of listResponse.Contents) {
					if (obj.Key) {
						objectsToDelete.push({ Key: obj.Key });
					}
				}
			}

			continuationToken = listResponse.IsTruncated ? listResponse.NextContinuationToken : undefined;
		} while (continuationToken);

		const errors: { key: string; code: string; message: string }[] = [];

		for (let i = 0; i < objectsToDelete.length; i += 1000) {
			const batch = objectsToDelete.slice(i, i + 1000);
			try {
				const response = await session.client.send(
					new DeleteObjectsCommand({
						Bucket: session.bucket,
						Delete: { Objects: batch },
					}),
				);
				if (response.Errors) {
					for (const err of response.Errors) {
						errors.push({ key: err.Key ?? "", code: err.Code ?? "Unknown", message: err.Message ?? "Unknown error" });
					}
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				throw new Error(`S3 delete error: ${message}`, { cause: err });
			}
		}

		if (errors.length > 0) {
			const details = errors.map((e) => `${e.key}: ${e.code}`).join(", ");
			throw new Error(`S3 partial delete failure: ${details}`);
		}
	}

	homeDir(): string {
		return "/";
	}

	async getRemoteStat(connectionId: number, remotePath: string): Promise<RemoteStat | null> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}

		const key = remotePath.replace(/^\/+/, "");
		if (key.length === 0) {
			return { exists: true, size: 0, modified: new Date().toISOString(), isDirectory: true };
		}

		try {
			const response = await session.client.send(new HeadObjectCommand({ Bucket: session.bucket, Key: key }));
			return {
				exists: true,
				size: response.ContentLength ?? 0,
				modified: response.LastModified ? response.LastModified.toISOString() : new Date().toISOString(),
				isDirectory: false,
			};
		} catch {
			return null;
		}
	}

	async uploadFile(
		connectionId: number,
		localPath: string,
		remotePath: string,
		onProgress?: (transferredBytes: number) => void,
		signal?: AbortSignal,
	): Promise<void> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}

		const key = remotePath.replace(/^\/+/, "");
		const readStream = createReadStream(localPath, { highWaterMark: 64 * 1024 });

		if (onProgress) {
			let totalBytesRead = 0;
			readStream.on("data", (chunk: Buffer) => {
				totalBytesRead += chunk.length;
				onProgress(totalBytesRead);
			});
		}

		try {
			await session.client.send(
				new PutObjectCommand({
					Bucket: session.bucket,
					Key: key,
					Body: readStream,
				}),
				{ abortSignal: signal },
			);
		} catch (err) {
			readStream.destroy();
			const message = err instanceof Error ? err.message : String(err);
			throw new Error(`S3 upload error: ${message}`, { cause: err });
		}
	}

	async downloadFile(
		connectionId: number,
		key: string,
		localPath: string,
		onProgress?: (transferredBytes: number) => void,
		signal?: AbortSignal,
	): Promise<void> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}

		mkdirSync(dirname(localPath), { recursive: true });

		const response = await session.client.send(
			new GetObjectCommand({ Bucket: session.bucket, Key: key.replace(/^\/+/, "") }),
			{ abortSignal: signal },
		);

		if (!response.Body) {
			throw new Error("S3 download error: empty response body");
		}

		const writeStream = createWriteStream(localPath);
		const body = response.Body as NodeJS.ReadableStream;

		if (!onProgress) {
			try {
				await pipeline(body, writeStream, { signal });
			} catch (err) {
				writeStream.destroy();
				const message = err instanceof Error ? err.message : String(err);
				throw new Error(`S3 download error: ${message}`, { cause: err });
			}
			return;
		}

		let totalBytesRead = 0;
		const counter = new Transform({
			transform(chunk: Buffer, _enc, callback): void {
				totalBytesRead += chunk.length;
				onProgress(totalBytesRead);
				callback(null, chunk);
			},
		});

		try {
			await pipeline(body, counter, writeStream, { signal });
		} catch (err) {
			writeStream.destroy();
			const message = err instanceof Error ? err.message : String(err);
			throw new Error(`S3 download error: ${message}`, { cause: err });
		}
	}
}
