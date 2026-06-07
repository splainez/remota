import { useTransferPanelStore } from "@renderer/store/transferPanel";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { createMockApi } from "@renderer/test/setup";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

import { FileBrowser } from "./FileBrowser";

beforeAll(() => {
	class ResizeObserverMock {
		observe() {
			/* noop */
		}
		unobserve() {
			/* noop */
		}
		disconnect() {
			/* noop */
		}
	}
	globalThis.ResizeObserver = ResizeObserverMock;
});

function createConnectedMockApi() {
	return createMockApi({
		platform: "linux",
		filesystem: {
			list: vi.fn().mockResolvedValue([]),
			listDrives: vi.fn().mockResolvedValue(["/"]),
			homeDir: vi.fn().mockResolvedValue("/home/user"),
			pathExists: vi.fn().mockResolvedValue(true),
			getLastPath: vi.fn().mockResolvedValue(null),
			setLastPath: vi.fn().mockResolvedValue(undefined),
			getIcon: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
			openPath: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
			rename: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
			remoteConnect: vi.fn().mockResolvedValue("/home/testuser"),
			remoteDisconnect: vi.fn().mockResolvedValue(undefined),
			remoteList: vi.fn().mockResolvedValue([]),
			remoteHomeDir: vi.fn().mockResolvedValue("/"),
			remoteRename: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
			tempGetPath: vi.fn().mockResolvedValue(undefined),
			tempWrite: vi.fn().mockResolvedValue(undefined),
			tempRead: vi.fn().mockResolvedValue([]),
			tempMkdir: vi.fn().mockResolvedValue(undefined),
			tempDelete: vi.fn().mockResolvedValue(undefined),
			tempExists: vi.fn().mockResolvedValue(false),
			download: vi.fn().mockResolvedValue({ jobId: "test-job" }),
			getLocalStat: vi.fn().mockResolvedValue({ exists: false, size: 0, modified: "", isDirectory: false }),
			onTransferProgress: vi.fn().mockReturnValue(vi.fn()),
			onTransferJobDone: vi.fn().mockReturnValue(vi.fn()),
			cancelTransfer: vi.fn().mockResolvedValue(undefined),
			cancelAllTransfers: vi.fn().mockResolvedValue(undefined),
			cancelTransfersForConnection: vi.fn().mockResolvedValue(undefined),
			startWatch: vi.fn().mockResolvedValue(undefined),
			stopWatch: vi.fn().mockResolvedValue(undefined),
			onFileChanged: vi.fn().mockReturnValue(vi.fn()),
		},
	});
}

const testConnection = {
	id: 1,
	name: "Test SFTP",
	protocol: "sftp" as const,
	host: "example.com",
	port: 22,
	username: "testuser",
	authType: "password" as const,
	password: "",
	privateKeyPath: "",
	accessKey: "",
	secretKey: "",
	region: "us-east-1",
	bucket: "",
	endpoint: "",
	useHttps: true,
	groupName: "",
	createdAt: "2024-01-01T00:00:00Z",
	updatedAt: "2024-01-01T00:00:00Z",
};

describe("FileBrowser", () => {
	let mockApi: ReturnType<typeof createConnectedMockApi>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockApi = createConnectedMockApi();
		vi.stubGlobal("api", mockApi);
		useTransferPanelStore.setState({ visibility: {}, loaded: false });
	});

	it("calls remoteConnect on mount", async () => {
		render(
			<I18nWrapper>
				<FileBrowser connection={testConnection} />
			</I18nWrapper>,
		);

		await waitFor(() => {
			expect(window.api.filesystem.remoteConnect).toHaveBeenCalledWith(1);
		});
	});

	it("shows error overlay when remoteConnect fails", async () => {
		mockApi.filesystem.remoteConnect = vi.fn().mockRejectedValue(new Error("Connection refused"));

		vi.stubGlobal("api", mockApi);

		render(
			<I18nWrapper>
				<FileBrowser connection={testConnection} />
			</I18nWrapper>,
		);

		await waitFor(() => {
			expect(screen.getByText("Connection refused")).toBeInTheDocument();
		});

		expect(screen.getByText("Retry")).toBeInTheDocument();
	});

	it("shows error detail toggle on connection failure", async () => {
		mockApi.filesystem.remoteConnect = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 192.168.1.1:22"));

		vi.stubGlobal("api", mockApi);

		render(
			<I18nWrapper>
				<FileBrowser connection={testConnection} />
			</I18nWrapper>,
		);

		await waitFor(() => {
			expect(screen.getByText("Show details")).toBeInTheDocument();
		});

		await userEvent.click(screen.getByText("Show details"));
		expect(screen.getByText("Hide details")).toBeInTheDocument();
		expect(screen.getByText("connect ECONNREFUSED 192.168.1.1:22")).toBeInTheDocument();
	});

	it("shows connecting state before connection completes", async () => {
		let resolveConnect!: (value: string) => void;
		const connectPromise = new Promise<string>((resolve) => {
			resolveConnect = resolve;
		});
		mockApi.filesystem.remoteConnect = vi.fn().mockReturnValue(connectPromise);

		vi.stubGlobal("api", mockApi);

		render(
			<I18nWrapper>
				<FileBrowser connection={testConnection} />
			</I18nWrapper>,
		);

		await waitFor(() => {
			expect(screen.getByText("Connecting...")).toBeInTheDocument();
		});

		resolveConnect("/home/testuser");
	});

	it("retries connection when retry button is clicked", async () => {
		mockApi.filesystem.remoteConnect = vi
			.fn()
			.mockRejectedValueOnce(new Error("Connection refused"))
			.mockResolvedValueOnce("/home/testuser");
		mockApi.filesystem.remoteList = vi.fn().mockResolvedValue([]);

		vi.stubGlobal("api", mockApi);

		render(
			<I18nWrapper>
				<FileBrowser connection={testConnection} />
			</I18nWrapper>,
		);

		await waitFor(() => {
			expect(screen.getByText("Retry")).toBeInTheDocument();
		});

		await userEvent.click(screen.getByText("Retry"));

		await waitFor(() => {
			expect(window.api.filesystem.remoteConnect).toHaveBeenCalledTimes(2);
		});
	});

	it("calls homeDir and getLastPath on mount", async () => {
		render(
			<I18nWrapper>
				<FileBrowser connection={testConnection} />
			</I18nWrapper>,
		);

		await waitFor(() => {
			expect(window.api.filesystem.homeDir).toHaveBeenCalled();
			expect(window.api.filesystem.getLastPath).toHaveBeenCalledWith(1, "local");
			expect(window.api.filesystem.getLastPath).toHaveBeenCalledWith(1, "remote");
		});
	});

	it("classifies auth failed errors", async () => {
		mockApi.filesystem.remoteConnect = vi
			.fn()
			.mockRejectedValue(new Error("All configured authentication methods failed"));

		vi.stubGlobal("api", mockApi);

		render(
			<I18nWrapper>
				<FileBrowser connection={testConnection} />
			</I18nWrapper>,
		);

		await waitFor(() => {
			expect(screen.getByText("Authentication failed")).toBeInTheDocument();
		});
	});

	it("classifies timeout errors", async () => {
		mockApi.filesystem.remoteConnect = vi.fn().mockRejectedValue(new Error("Timed out while waiting for handshake"));

		vi.stubGlobal("api", mockApi);

		render(
			<I18nWrapper>
				<FileBrowser connection={testConnection} />
			</I18nWrapper>,
		);

		await waitFor(() => {
			expect(screen.getByText("Connection timed out")).toBeInTheDocument();
		});
	});

	it("classifies host unreachable errors", async () => {
		mockApi.filesystem.remoteConnect = vi.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND nonexistenthost"));

		vi.stubGlobal("api", mockApi);

		render(
			<I18nWrapper>
				<FileBrowser connection={testConnection} />
			</I18nWrapper>,
		);

		await waitFor(() => {
			expect(screen.getByText("Host unreachable")).toBeInTheDocument();
		});
	});

	it("classifies host key rejected errors", async () => {
		mockApi.filesystem.remoteConnect = vi.fn().mockRejectedValue(new Error("Host key verification failed"));

		vi.stubGlobal("api", mockApi);

		render(
			<I18nWrapper>
				<FileBrowser connection={testConnection} />
			</I18nWrapper>,
		);

		await waitFor(() => {
			expect(screen.getByText("Host key verification failed")).toBeInTheDocument();
		});
	});

	describe("active transfers panel", () => {
		it("does not render the active transfers panel by default", async () => {
			render(
				<I18nWrapper>
					<FileBrowser connection={testConnection} />
				</I18nWrapper>,
			);

			await waitFor(() => {
				expect(window.api.filesystem.remoteConnect).toHaveBeenCalled();
			});

			expect(screen.queryByText("Active Transfers")).not.toBeInTheDocument();
		});

		it("renders the active transfers panel when visible for the connection", async () => {
			useTransferPanelStore.setState({ visibility: { 1: true } });

			render(
				<I18nWrapper>
					<FileBrowser connection={testConnection} />
				</I18nWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByText("Active Transfers")).toBeInTheDocument();
			});
		});

		it("hides the panel when its visibility flips to false", async () => {
			useTransferPanelStore.setState({ visibility: { 1: true } });

			const { rerender } = render(
				<I18nWrapper>
					<FileBrowser connection={testConnection} />
				</I18nWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByText("Active Transfers")).toBeInTheDocument();
			});

			useTransferPanelStore.setState({ visibility: { 1: false } });
			rerender(
				<I18nWrapper>
					<FileBrowser connection={testConnection} />
				</I18nWrapper>,
			);

			await waitFor(() => {
				expect(screen.queryByText("Active Transfers")).not.toBeInTheDocument();
			});
		});

		it("calls setVisible(false) when the panel close button is pressed", async () => {
			useTransferPanelStore.setState({ visibility: { 1: true } });
			const setSpy = vi.fn().mockResolvedValue(undefined);
			mockApi.transferPanel.set = setSpy;
			vi.stubGlobal("api", mockApi);

			const user = userEvent.setup();

			render(
				<I18nWrapper>
					<FileBrowser connection={testConnection} />
				</I18nWrapper>,
			);

			await waitFor(() => {
				expect(screen.getByText("Active Transfers")).toBeInTheDocument();
			});

			const closeBtn = screen.getByTitle("Close transfers panel");
			await user.click(closeBtn);

			expect(useTransferPanelStore.getState().isVisible(1)).toBe(false);
		});
	});
});
