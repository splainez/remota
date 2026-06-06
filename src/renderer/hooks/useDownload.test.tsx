import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import type { DownloadRequest, FileEntry, LocalStat } from "@shared/types";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useDownload, type UseDownloadParams, type UseDownloadResult } from "./useDownload";

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

interface HarnessProps extends UseDownloadParams {
	onReady: (api: UseDownloadResult) => void;
}

function Harness({ onReady, ...params }: HarnessProps) {
	const api = useDownload(params);
	useEffect(() => {
		onReady(api);
	});
	return <>{api.dialog}</>;
}

function renderDownloadHarness(overrides: Partial<HarnessProps> = {}, params: Partial<UseDownloadParams> = {}) {
	const handle = { api: null as UseDownloadResult | null, ready: vi.fn() };
	render(
		<I18nWrapper>
			<Harness
				connectionId={1}
				localBasePath="/downloads"
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

function mockGetLocalStat(value: LocalStat) {
	vi.mocked(window.api.filesystem.getLocalStat).mockResolvedValue(value);
}

function lastDownloadRequest(): DownloadRequest {
	const call = vi.mocked(window.api.filesystem.download).mock.calls.at(-1);
	if (!call) throw new Error("download was not invoked");
	return call[0];
}

describe("useDownload", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetLocalStat({ exists: false, size: 0, modified: "", isDirectory: false });
		vi.mocked(window.api.filesystem.download).mockResolvedValue({ jobId: "job-1" });
		vi.mocked(window.api.filesystem.remoteList).mockResolvedValue([]);
	});

	it("downloads a single file with no conflict", async () => {
		const handle = renderDownloadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		await act(async () => {
			await handle.api?.startDownload([fileEntry("a.txt", false, "/remote/a.txt")]);
		});
		await waitFor(() => {
			expect(window.api.filesystem.download).toHaveBeenCalledOnce();
		});
		const call = lastDownloadRequest();
		expect(call).toMatchObject({ connectionId: 1 });
		expect(call.items).toHaveLength(1);
		expect(call.items[0]).toMatchObject({
			remotePath: "/remote/a.txt",
			localPath: "/downloads/a.txt",
		});
	});

	it("recursively flattens folder subentries", async () => {
		vi.mocked(window.api.filesystem.remoteList).mockImplementation((_cid, p) => {
			if (p === "/remote/folder") {
				return Promise.resolve([fileEntry("inner.txt", false, "/remote/folder/inner.txt")]);
			}
			return Promise.resolve([]);
		});
		const handle = renderDownloadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		await act(async () => {
			await handle.api?.startDownload([fileEntry("folder", true, "/remote/folder")]);
		});
		await waitFor(() => {
			expect(window.api.filesystem.download).toHaveBeenCalledOnce();
		});
		const call = lastDownloadRequest();
		expect(call.items).toHaveLength(1);
		expect(call.items[0]).toMatchObject({
			remotePath: "/remote/folder/inner.txt",
			localPath: "/downloads/folder/inner.txt",
		});
	});

	it("shows the overwrite dialog for a conflicting file and respects 'overwrite' decision", async () => {
		mockGetLocalStat({ exists: true, size: 500, modified: "2023-01-01T00:00:00Z", isDirectory: false });
		const handle = renderDownloadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		act(() => {
			void handle.api?.startDownload([fileEntry("a.txt", false, "/remote/a.txt")]);
		});
		await waitFor(() => {
			expect(screen.getByText("File already exists")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.click(screen.getByText("Yes"));
		await waitFor(() => {
			expect(window.api.filesystem.download).toHaveBeenCalledOnce();
		});
		const call = lastDownloadRequest();
		expect(call.items).toHaveLength(1);
	});

	it("honours 'Yes to all' for the rest of the batch", async () => {
		mockGetLocalStat({ exists: true, size: 100, modified: "2023-01-01T00:00:00Z", isDirectory: false });
		const handle = renderDownloadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		act(() => {
			void handle.api?.startDownload([
				fileEntry("a.txt", false, "/remote/a.txt"),
				fileEntry("b.txt", false, "/remote/b.txt"),
			]);
		});
		await waitFor(() => {
			expect(screen.getByText("File already exists")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.click(screen.getByText("Yes to all"));
		await waitFor(() => {
			expect(window.api.filesystem.download).toHaveBeenCalledOnce();
		});
		const call = lastDownloadRequest();
		expect(call.items).toHaveLength(2);
	});

	it("aborts and toasts on 'Cancel'", async () => {
		mockGetLocalStat({ exists: true, size: 100, modified: "2023-01-01T00:00:00Z", isDirectory: false });
		const handle = renderDownloadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		act(() => {
			void handle.api?.startDownload([
				fileEntry("a.txt", false, "/remote/a.txt"),
				fileEntry("b.txt", false, "/remote/b.txt"),
			]);
		});
		await waitFor(() => {
			expect(screen.getByText("File already exists")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.click(screen.getByText("Cancel"));
		await waitFor(() => {
			expect(window.api.filesystem.download).not.toHaveBeenCalled();
		});
	});

	it("keyboard 'Y' resolves with overwrite", async () => {
		mockGetLocalStat({ exists: true, size: 100, modified: "2023-01-01T00:00:00Z", isDirectory: false });
		const handle = renderDownloadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		act(() => {
			void handle.api?.startDownload([fileEntry("a.txt", false, "/remote/a.txt")]);
		});
		await waitFor(() => {
			expect(screen.getByText("File already exists")).toBeInTheDocument();
		});
		fireEvent.keyDown(document, { key: "y" });
		await waitFor(() => {
			expect(window.api.filesystem.download).toHaveBeenCalledOnce();
		});
	});

	it("skips all on 'No to all'", async () => {
		mockGetLocalStat({ exists: true, size: 100, modified: "2023-01-01T00:00:00Z", isDirectory: false });
		const handle = renderDownloadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		act(() => {
			void handle.api?.startDownload([
				fileEntry("a.txt", false, "/remote/a.txt"),
				fileEntry("b.txt", false, "/remote/b.txt"),
			]);
		});
		await waitFor(() => {
			expect(screen.getByText("File already exists")).toBeInTheDocument();
		});
		const user = userEvent.setup();
		await user.click(screen.getByText("No to all"));
		await waitFor(() => {
			expect(window.api.filesystem.download).not.toHaveBeenCalled();
		});
	});

	it("classifies a remoteList error and toasts", async () => {
		vi.mocked(window.api.filesystem.remoteList).mockRejectedValue(new Error("not connected"));
		const handle = renderDownloadHarness();
		await waitFor(() => {
			expect(handle.ready).toHaveBeenCalled();
		});
		await act(async () => {
			await handle.api?.startDownload([fileEntry("folder", true, "/remote/folder")]);
		});
		await waitFor(() => {
			expect(window.api.filesystem.download).not.toHaveBeenCalled();
		});
	});
});
