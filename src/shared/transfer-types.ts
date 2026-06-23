import type { TranslationKey } from "@i18n/i18n";
import { z } from "zod";

export const DownloadItemSchema = z.object({
	id: z.string(),
	remotePath: z.string(),
	localPath: z.string(),
	remoteModified: z.string(),
	size: z.number(),
});

export const UploadItemSchema = z.object({
	id: z.string(),
	localPath: z.string(),
	remotePath: z.string(),
	size: z.number(),
	mode: z.number().optional(),
	uid: z.number().optional(),
	gid: z.number().optional(),
});

export const DownloadRequestSchema = z.object({
	connectionId: z.number(),
	items: z.array(DownloadItemSchema),
});

export interface DownloadItem {
	id: string;
	remotePath: string;
	localPath: string;
	remoteModified: string;
	size: number;
}

export interface DownloadRequest {
	connectionId: number;
	items: DownloadItem[];
}

export interface DownloadResult {
	jobId: string;
}

export type DownloadItemStatus = "ok" | "error" | "cancelled";

export interface DownloadItemResult {
	id: string;
	status: DownloadItemStatus;
	error?: string;
}

export interface DownloadJobResult {
	jobId: string;
	results: Record<string, DownloadItemResult>;
}

export const UploadRequestSchema = z.object({
	connectionId: z.number(),
	items: z.array(UploadItemSchema),
});

export interface UploadItem {
	id: string;
	localPath: string;
	remotePath: string;
	size: number;
	mode?: number;
	uid?: number;
	gid?: number;
}

export interface UploadRequest {
	connectionId: number;
	items: UploadItem[];
}

export interface UploadResult {
	jobId: string;
}

export type UploadItemStatus = "ok" | "error" | "cancelled";

export interface UploadItemResult {
	id: string;
	status: UploadItemStatus;
	error?: string;
}

export interface UploadJobResult {
	jobId: string;
	results: Record<string, UploadItemResult>;
}

export interface RemoteStat {
	exists: boolean;
	size: number;
	modified: string;
	isDirectory: boolean;
	mode?: number;
	uid?: number;
	gid?: number;
}

export interface LocalStat {
	exists: boolean;
	size: number;
	modified: string;
	isDirectory: boolean;
}

export type TransferDirection = "download" | "upload";

export type TransferItemStatus = "queued" | "active" | "completed" | "failed" | "cancelled";

export interface TransferProgressEvent {
	jobId: string;
	id: string;
	connectionId: number;
	name: string;
	source: string;
	target: string;
	direction: TransferDirection;
	totalBytes: number;
	transferredBytes: number;
	status: TransferItemStatus;
	error?: string;
}

export const TRANSFER_ITEM_STATUS_KEYS: Record<TransferItemStatus, TranslationKey> = {
	queued: "transfer.item.queued",
	active: "transfer.item.active",
	completed: "transfer.item.completed",
	failed: "transfer.item.failed",
	cancelled: "transfer.item.cancelled",
};
