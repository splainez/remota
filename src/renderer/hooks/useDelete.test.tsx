import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import type { FileEntry } from "@shared/types";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useDelete, type UseDeleteParams } from "./useDelete";

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

const fileEntry = (name: string, fullPath: string, isDirectory = false): FileEntry => ({
	name,
	fullPath,
	isDirectory,
	size: 1024,
	modified: "2024-01-15T10:30:00Z",
});

interface TestHarnessProps {
	params: UseDeleteParams;
	startEntries?: FileEntry[];
}

function TestHarness({ params, startEntries = entries }: TestHarnessProps) {
	const api = useDelete(params);
	return (
		<div>
			{api.dialog}
			<button type="button" data-testid="start-delete" onClick={() => void api.startDelete(startEntries)}>
				Delete
			</button>
		</div>
	);
}

const entries: FileEntry[] = [fileEntry("test.txt", "/home/user/test.txt")];

function renderDeleteTest(overrides: Partial<UseDeleteParams> = {}, startEntries?: FileEntry[]) {
	const refresh = overrides.refresh ?? vi.fn().mockResolvedValue(undefined);
	render(
		<I18nWrapper>
			<TestHarness
				params={{
					panelType: "local",
					connectionId: 1,
					refresh,
					...overrides,
				}}
				startEntries={startEntries}
			/>
		</I18nWrapper>,
	);
	return { refresh };
}

describe("useDelete", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(window.api.filesystem.delete).mockResolvedValue(undefined);
		vi.mocked(window.api.filesystem.remoteDelete).mockResolvedValue(undefined);
		vi.mocked(window.api.filesystem.remoteList).mockResolvedValue([]);
	});

	it("shows confirmation dialog before deleting", async () => {
		const user = userEvent.setup();
		renderDeleteTest();

		await user.click(screen.getByTestId("start-delete"));

		await waitFor(() => {
			expect(screen.getByText(/test\.txt/)).toBeInTheDocument();
		});

		expect(window.api.filesystem.delete).not.toHaveBeenCalled();
	});

	it("calls filesystem.delete when user confirms", async () => {
		const user = userEvent.setup();
		renderDeleteTest();

		await user.click(screen.getByTestId("start-delete"));

		await waitFor(() => {
			expect(screen.getByText(/test\.txt/)).toBeInTheDocument();
		});

		await user.click(screen.getByText("Yes"));

		await waitFor(() => {
			expect(window.api.filesystem.delete).toHaveBeenCalledWith("/home/user/test.txt");
		});
	});

	it("calls filesystem.remoteDelete for remote panel", async () => {
		const user = userEvent.setup();
		renderDeleteTest({ panelType: "remote", connectionId: 42 });

		await user.click(screen.getByTestId("start-delete"));

		await waitFor(() => {
			expect(screen.getByText(/test\.txt/)).toBeInTheDocument();
		});

		await user.click(screen.getByText("Yes"));

		await waitFor(() => {
			expect(window.api.filesystem.remoteDelete).toHaveBeenCalledWith(42, "/home/user/test.txt");
		});
	});

	it("does not call delete when cancelled", async () => {
		const user = userEvent.setup();
		renderDeleteTest();

		await user.click(screen.getByTestId("start-delete"));

		await waitFor(() => {
			expect(screen.getByText(/test\.txt/)).toBeInTheDocument();
		});

		await user.click(screen.getByText("Cancel"));

		await waitFor(() => {
			expect(screen.queryByText(/test\.txt/)).not.toBeInTheDocument();
		});

		expect(window.api.filesystem.delete).not.toHaveBeenCalled();
	});

	it("calls refresh after successful deletion", async () => {
		const user = userEvent.setup();
		const refresh = vi.fn().mockResolvedValue(undefined);
		renderDeleteTest({ refresh });

		await user.click(screen.getByTestId("start-delete"));

		await waitFor(() => {
			expect(screen.getByText(/test\.txt/)).toBeInTheDocument();
		});

		await user.click(screen.getByText("Yes"));

		await waitFor(() => {
			expect(refresh).toHaveBeenCalled();
		});
	});

	it("does nothing when entries array is empty", async () => {
		const user = userEvent.setup();
		renderDeleteTest({}, []);

		await user.click(screen.getByTestId("start-delete"));

		expect(window.api.filesystem.delete).not.toHaveBeenCalled();
	});

	it("deletes remote folder by calling remoteDelete for files AND the folder itself", async () => {
		const user = userEvent.setup();
		vi.mocked(window.api.filesystem.remoteList).mockResolvedValueOnce([
			fileEntry("a.txt", "/remote/mydir/a.txt"),
			fileEntry("b.txt", "/remote/mydir/b.txt"),
		]);
		const folder = fileEntry("mydir", "/remote/mydir", true);
		renderDeleteTest({ panelType: "remote", connectionId: 5 }, [folder]);

		await user.click(screen.getByTestId("start-delete"));

		await waitFor(() => {
			expect(screen.getByText(/a\.txt/)).toBeInTheDocument();
		});
		await user.click(screen.getByText("Yes"));

		await waitFor(() => {
			expect(screen.getByText(/b\.txt/)).toBeInTheDocument();
		});
		await user.click(screen.getByText("Yes"));

		await waitFor(() => {
			expect(screen.getByText(/mydir/)).toBeInTheDocument();
		});
		await user.click(screen.getByText("Yes"));

		await waitFor(() => {
			expect(window.api.filesystem.remoteDelete).toHaveBeenCalledWith(5, "/remote/mydir/a.txt");
			expect(window.api.filesystem.remoteDelete).toHaveBeenCalledWith(5, "/remote/mydir/b.txt");
			expect(window.api.filesystem.remoteDelete).toHaveBeenCalledWith(5, "/remote/mydir");
		});
	});

	it("deletes nested remote folders in correct order (children before parents)", async () => {
		const user = userEvent.setup();
		vi.mocked(window.api.filesystem.remoteList)
			.mockResolvedValueOnce([
				fileEntry("sub", "/remote/mydir/sub", true),
				fileEntry("root.txt", "/remote/mydir/root.txt"),
			])
			.mockResolvedValueOnce([fileEntry("deep.txt", "/remote/mydir/sub/deep.txt")]);
		const folder = fileEntry("mydir", "/remote/mydir", true);
		renderDeleteTest({ panelType: "remote", connectionId: 7 }, [folder]);

		await user.click(screen.getByTestId("start-delete"));

		await waitFor(() => {
			expect(screen.getByText(/deep\.txt/)).toBeInTheDocument();
		});
		await user.click(screen.getByText("Yes"));

		await waitFor(() => {
			expect(screen.getByText(/sub/)).toBeInTheDocument();
		});
		await user.click(screen.getByText("Yes"));

		await waitFor(() => {
			expect(screen.getByText(/root\.txt/)).toBeInTheDocument();
		});
		await user.click(screen.getByText("Yes"));

		await waitFor(() => {
			expect(screen.getByText(/mydir/)).toBeInTheDocument();
		});
		await user.click(screen.getByText("Yes"));

		const calls = vi.mocked(window.api.filesystem.remoteDelete).mock.calls;
		const paths = calls.map((c) => c[1]);
		expect(paths).toEqual([
			"/remote/mydir/sub/deep.txt",
			"/remote/mydir/sub",
			"/remote/mydir/root.txt",
			"/remote/mydir",
		]);
	});

	it("deletes empty remote folder", async () => {
		const user = userEvent.setup();
		const folder = fileEntry("empty", "/remote/empty", true);
		renderDeleteTest({ panelType: "remote", connectionId: 3 }, [folder]);

		await user.click(screen.getByTestId("start-delete"));

		await waitFor(() => {
			expect(screen.getByText(/empty/)).toBeInTheDocument();
		});
		await user.click(screen.getByText("Yes"));

		await waitFor(() => {
			expect(window.api.filesystem.remoteDelete).toHaveBeenCalledWith(3, "/remote/empty");
		});
	});
});
