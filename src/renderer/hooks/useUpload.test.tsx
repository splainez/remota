import { useTransferStore } from "@renderer/store/transfer";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import type { FileEntry, RemoteStat, UploadRequest } from "@shared/types";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useUpload, type UseUploadParams, type UseUploadResult } from "./useUpload";

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

interface HarnessProps extends UseUploadParams {
	onReady: (api: UseUploadResult) => void;
}

function Harness({ onReady, ...params }: HarnessProps) {
	const api = useUpload(params);
	useEffect(() => {
		onReady(api);
	});
	return <>{api.dialog}</>;
}

function renderUploadHarness(overrides: Partial<HarnessProps> = {}, params: Partial<UseUploadParams> = {}) {
	const handle = { api: null as UseUploadResult | null, ready: vi.fn() };
	render(
		<I18nWrapper>
			<Harness
				connectionId={1}
				localBasePath="/local"
				remoteBasePath="/remote"
				onReady={(api) => {
					handle.api = api;
					handle.ready();
				}}
				{...overrides}
				{...params}
			/>
		</I18nWrapper>,
	);
	return handle;
}

const fileEntry = (name: string, isDirectory: boolean, fullPath: string): FileEntry => ({
	name,
	fullPath,
	isDirectory,
	size: 1024,
	modified: "2024-01-15T10:30:00Z",
});

function mockGetRemoteStat(value: RemoteStat | null) {
	vi.mocked(window.api.filesystem.getRemoteStat).mockResolvedValue(value);
}

function lastUploadRequest(): UploadRequest {
	const call = vi.mocked(window.api.filesystem.upload).mock.calls.at(-1);
	if (!call) throw new Error("upload was not invoked");
	return call[0];
}

describe("useUpload", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useTransferStore.getState().reset();
		mockGetRemoteStat(null);
		vi.mocked(window.api.filesystem.upload).mockResolvedValue({ jobId: "job-1" });
		vi.mocked(window.api.filesystem.list).mockResolvedValue([]);
	});

	it("uploads a single file with no conflict", async () => {
		const handle = renderUploadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		await act(async () => {
			await handle.api?.startUpload([fileEntry("a.txt", false, "/local/a.txt")]);
		});
		await waitFor(() => {
			expect(window.api.filesystem.upload).toHaveBeenCalledOnce();
		});
		const call = lastUploadRequest();
		expect(call).toMatchObject({ connectionId: 1 });
		expect(call.items).toHaveLength(1);
		expect(call.items[0]).toMatchObject({
			localPath: "/local/a.txt",
			remotePath: "/remote/a.txt",
		});
	});

	it("recursively flattens folder subentries", async () => {
		vi.mocked(window.api.filesystem.list).mockImplementation((p: string) => {
			if (p === "/local/folder") {
				return Promise.resolve([fileEntry("inner.txt", false, "/local/folder/inner.txt")]);
			}
			return Promise.resolve([]);
		});
		const handle = renderUploadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		await act(async () => {
			await handle.api?.startUpload([fileEntry("folder", true, "/local/folder")]);
		});
		await waitFor(() => {
			expect(window.api.filesystem.upload).toHaveBeenCalledOnce();
		});
		const call = lastUploadRequest();
		expect(call.items).toHaveLength(1);
		expect(call.items[0]).toMatchObject({
			localPath: "/local/folder/inner.txt",
			remotePath: "/remote/folder/inner.txt",
		});
	});

	it("shows overwrite dialog for remote conflict and respects 'overwrite'", async () => {
		mockGetRemoteStat({ exists: true, size: 500, modified: "2023-01-01T00:00:00Z", isDirectory: false });
		const handle = renderUploadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		act(() => {
			void handle.api?.startUpload([fileEntry("a.txt", false, "/local/a.txt")]);
		});
		await waitFor(() => {
			expect(screen.getByText("File already exists")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.click(screen.getByText("Yes"));
		await waitFor(() => {
			expect(window.api.filesystem.upload).toHaveBeenCalledOnce();
		});
		const call = lastUploadRequest();
		expect(call.items).toHaveLength(1);
	});

	it("honours 'Yes to all' for the rest of the batch", async () => {
		mockGetRemoteStat({ exists: true, size: 100, modified: "2023-01-01T00:00:00Z", isDirectory: false });
		const handle = renderUploadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		act(() => {
			void handle.api?.startUpload([
				fileEntry("a.txt", false, "/local/a.txt"),
				fileEntry("b.txt", false, "/local/b.txt"),
			]);
		});
		await waitFor(() => {
			expect(screen.getByText("File already exists")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.click(screen.getByText("Yes to all"));
		await waitFor(() => {
			expect(window.api.filesystem.upload).toHaveBeenCalledOnce();
		});
		const call = lastUploadRequest();
		expect(call.items).toHaveLength(2);
	});

	it("aborts and toasts on 'Cancel'", async () => {
		mockGetRemoteStat({ exists: true, size: 100, modified: "2023-01-01T00:00:00Z", isDirectory: false });
		const handle = renderUploadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		act(() => {
			void handle.api?.startUpload([
				fileEntry("a.txt", false, "/local/a.txt"),
				fileEntry("b.txt", false, "/local/b.txt"),
			]);
		});
		await waitFor(() => {
			expect(screen.getByText("File already exists")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.click(screen.getByText("Cancel"));
		await waitFor(() => {
			expect(window.api.filesystem.upload).not.toHaveBeenCalled();
		});
	});

	it("skips all on 'No to all'", async () => {
		mockGetRemoteStat({ exists: true, size: 100, modified: "2023-01-01T00:00:00Z", isDirectory: false });
		const handle = renderUploadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		act(() => {
			void handle.api?.startUpload([
				fileEntry("a.txt", false, "/local/a.txt"),
				fileEntry("b.txt", false, "/local/b.txt"),
			]);
		});
		await waitFor(() => {
			expect(screen.getByText("File already exists")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.click(screen.getByText("No to all"));
		await waitFor(() => {
			expect(window.api.filesystem.upload).not.toHaveBeenCalled();
		});
	});

	it("classifies a local list error and toasts", async () => {
		vi.mocked(window.api.filesystem.list).mockRejectedValue(new Error("permission denied"));
		const handle = renderUploadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		await act(async () => {
			await handle.api?.startUpload([fileEntry("folder", true, "/local/folder")]);
		});
		await waitFor(() => {
			expect(window.api.filesystem.upload).not.toHaveBeenCalled();
		});
	});

	it("shows duplicate dialog when file is already being uploaded", async () => {
		useTransferStore.getState().handleProgress({
			jobId: "existing-job",
			id: "existing-item",
			connectionId: 1,
			name: "a.txt",
			source: "/local/a.txt",
			target: "/remote/a.txt",
			direction: "upload",
			totalBytes: 100,
			transferredBytes: 50,
			status: "active",
		});
		const handle = renderUploadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		act(() => {
			void handle.api?.startUpload([fileEntry("a.txt", false, "/local/a.txt")]);
		});
		await waitFor(() => {
			expect(screen.getByText("Upload in progress")).toBeInTheDocument();
		});
	});

	it("restarts upload when user chooses 'Restart'", async () => {
		useTransferStore.getState().handleProgress({
			jobId: "existing-job",
			id: "existing-item",
			connectionId: 1,
			name: "a.txt",
			source: "/local/a.txt",
			target: "/remote/a.txt",
			direction: "upload",
			totalBytes: 100,
			transferredBytes: 50,
			status: "active",
		});
		const handle = renderUploadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		act(() => {
			void handle.api?.startUpload([fileEntry("a.txt", false, "/local/a.txt")]);
		});
		await waitFor(() => {
			expect(screen.getByText("Upload in progress")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.click(screen.getByText("Restart"));
		await waitFor(() => {
			expect(window.api.filesystem.cancelTransfer).toHaveBeenCalledWith("existing-job", "existing-item");
		});
		await waitFor(() => {
			expect(window.api.filesystem.upload).toHaveBeenCalledOnce();
		});
	});

	it("skips duplicate when user chooses 'Keep existing'", async () => {
		useTransferStore.getState().handleProgress({
			jobId: "existing-job",
			id: "existing-item",
			connectionId: 1,
			name: "a.txt",
			source: "/local/a.txt",
			target: "/remote/a.txt",
			direction: "upload",
			totalBytes: 100,
			transferredBytes: 50,
			status: "active",
		});
		const handle = renderUploadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		act(() => {
			void handle.api?.startUpload([fileEntry("a.txt", false, "/local/a.txt")]);
		});
		await waitFor(() => {
			expect(screen.getByText("Upload in progress")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.click(screen.getByText("Keep existing"));
		await waitFor(() => {
			expect(window.api.filesystem.upload).not.toHaveBeenCalled();
		});
	});

	it("cancels all when user chooses 'Cancel' on duplicate dialog", async () => {
		useTransferStore.getState().handleProgress({
			jobId: "existing-job",
			id: "existing-item",
			connectionId: 1,
			name: "a.txt",
			source: "/local/a.txt",
			target: "/remote/a.txt",
			direction: "upload",
			totalBytes: 100,
			transferredBytes: 50,
			status: "active",
		});
		const handle = renderUploadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		act(() => {
			void handle.api?.startUpload([fileEntry("a.txt", false, "/local/a.txt")]);
		});
		await waitFor(() => {
			expect(screen.getByText("Upload in progress")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.click(screen.getByText("Cancel"));
		await waitFor(() => {
			expect(window.api.filesystem.upload).not.toHaveBeenCalled();
		});
	});

	it("computes correct remote path for Windows local paths (bug: full Windows path leaked into remote path)", async () => {
		const handle = renderUploadHarness(
			{},
			{
				localBasePath: "Z:\\testuser",
				remoteBasePath: "/home/user",
			},
		);
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		await act(async () => {
			await handle.api?.startUpload([fileEntry("hola.txt", false, "Z:\\testuser\\hola.txt")]);
		});
		await waitFor(() => {
			expect(window.api.filesystem.upload).toHaveBeenCalledOnce();
		});
		const call = lastUploadRequest();
		expect(call.items).toHaveLength(1);
		expect(call.items[0]).toMatchObject({
			localPath: "Z:\\testuser\\hola.txt",
			remotePath: "/home/user/hola.txt",
		});
	});

	it("computes correct remote path for nested Windows local paths", async () => {
		const handle = renderUploadHarness(
			{},
			{
				localBasePath: "Z:\\testuser",
				remoteBasePath: "/home/user",
			},
		);
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		vi.mocked(window.api.filesystem.list).mockImplementation((p: string) => {
			if (p === "Z:\\testuser\\subdir") {
				return Promise.resolve([fileEntry("nested.txt", false, "Z:\\testuser\\subdir\\nested.txt")]);
			}
			return Promise.resolve([]);
		});
		await act(async () => {
			await handle.api?.startUpload([fileEntry("subdir", true, "Z:\\testuser\\subdir")]);
		});
		await waitFor(() => {
			expect(window.api.filesystem.upload).toHaveBeenCalledOnce();
		});
		const call = lastUploadRequest();
		expect(call.items[0]).toMatchObject({
			localPath: "Z:\\testuser\\subdir\\nested.txt",
			remotePath: "/home/user/subdir/nested.txt",
		});
	});

	it("computes correct remote path for mixed separator local paths", async () => {
		const handle = renderUploadHarness(
			{},
			{
				localBasePath: "Z:/testuser",
				remoteBasePath: "/home/user",
			},
		);
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		await act(async () => {
			await handle.api?.startUpload([fileEntry("hola.txt", false, "Z:/testuser/hola.txt")]);
		});
		await waitFor(() => {
			expect(window.api.filesystem.upload).toHaveBeenCalledOnce();
		});
		const call = lastUploadRequest();
		expect(call.items[0]).toMatchObject({
			localPath: "Z:/testuser/hola.txt",
			remotePath: "/home/user/hola.txt",
		});
	});

	it("computes correct remote path for Unix local paths", async () => {
		const handle = renderUploadHarness(
			{},
			{
				localBasePath: "/home/testuser",
				remoteBasePath: "/remote",
			},
		);
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		await act(async () => {
			await handle.api?.startUpload([fileEntry("a.txt", false, "/home/testuser/a.txt")]);
		});
		await waitFor(() => {
			expect(window.api.filesystem.upload).toHaveBeenCalledOnce();
		});
		const call = lastUploadRequest();
		expect(call.items[0]).toMatchObject({
			localPath: "/home/testuser/a.txt",
			remotePath: "/remote/a.txt",
		});
	});
});
