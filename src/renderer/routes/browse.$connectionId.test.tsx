import { DisconnectConfirmDialog } from "@renderer/components/FileBrowser/DisconnectConfirmDialog";
import { useTransferStore } from "@renderer/store/transfer";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useEffect, useRef, useState } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockNavigate = vi.fn();
const mockReset = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({
		navigate: mockNavigate,
		state: { location: { pathname: "/browse/1" } },
	}),
}));

vi.mock("@renderer/hooks/useConnections", () => ({
	useConnections: () => ({
		connections: [
			{
				id: 1,
				name: "Test Server",
				protocol: "sftp",
				host: "example.com",
				port: 22,
				username: "user",
				authType: "password",
			},
		],
		selected: null,
		loading: false,
		select: vi.fn(),
	}),
}));

const mockCancelTransfers = vi.fn().mockResolvedValue(undefined);
const mockRemoteDisconnect = vi.fn().mockResolvedValue(undefined);

vi.stubGlobal("api", {
	...window.api,
	filesystem: {
		...window.api.filesystem,
		cancelTransfersForConnection: mockCancelTransfers,
		remoteDisconnect: mockRemoteDisconnect,
	},
});

const CONFIRM_BUTTON_TEXT = "Cancel and disconnect";

function BrowseRouteShim() {
	const connId = 1;
	const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
	const blockedLocationRef = useRef("/");

	const hasActiveTransfers = useTransferStore((s) => s.pendingCount(connId) > 0);

	const blockerBlocked = useTransferStore.getState().pendingCount(connId) > 0;

	useEffect(() => {
		if (blockerBlocked) {
			blockedLocationRef.current = "/";
			setDisconnectDialogOpen(true);
		}
	}, [blockerBlocked]);

	const handleConfirmDisconnect = useCallback(() => {
		setDisconnectDialogOpen(false);
		useTransferStore.getState().clearAll(connId);
		void (async () => {
			await window.api.filesystem.cancelTransfersForConnection(connId);
			await window.api.filesystem.remoteDisconnect(connId);
			const target = blockedLocationRef.current;
			mockReset();
			void mockNavigate({ to: target });
		})();
	}, []);

	const handleDisconnect = useCallback(() => {
		if (hasActiveTransfers) {
			setDisconnectDialogOpen(true);
			return;
		}
		void (async () => {
			await window.api.filesystem.remoteDisconnect(connId);
			void mockNavigate({ to: "/" });
		})();
	}, [connId, hasActiveTransfers]);

	return (
		<>
			<DisconnectConfirmDialog
				open={disconnectDialogOpen}
				onOpenChange={setDisconnectDialogOpen}
				onConfirmDisconnect={handleConfirmDisconnect}
			/>
			<button data-testid="disconnect-btn" onClick={handleDisconnect}>
				Disconnect
			</button>
		</>
	);
}

function makeQueuedItem(id: string, connectionId: number) {
	return {
		id,
		jobId: `job-${id}`,
		connectionId,
		name: `file-${id}.txt`,
		source: `/remote/file-${id}.txt`,
		target: `/local/file-${id}.txt`,
		direction: "download" as const,
		totalBytes: 1000,
		transferredBytes: 0,
		status: "queued" as const,
	};
}

describe("BrowseRoute disconnect double-dialog bug", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useTransferStore.getState().reset();
	});

	afterEach(() => {
		useTransferStore.getState().reset();
	});

	it("dialog opens when disconnect clicked with active transfers", async () => {
		const user = userEvent.setup();

		act(() => {
			useTransferStore.getState().handleProgress(makeQueuedItem("t1", 1));
		});

		render(
			<I18nWrapper>
				<BrowseRouteShim />
			</I18nWrapper>,
		);

		await user.click(screen.getByTestId("disconnect-btn"));
		expect(screen.getByRole("alertdialog")).toBeInTheDocument();
	});

	it("dialog closes after confirm disconnect and stays closed", async () => {
		const user = userEvent.setup();

		act(() => {
			useTransferStore.getState().handleProgress(makeQueuedItem("t1", 1));
		});

		render(
			<I18nWrapper>
				<BrowseRouteShim />
			</I18nWrapper>,
		);

		await user.click(screen.getByTestId("disconnect-btn"));
		expect(screen.getByRole("alertdialog")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: CONFIRM_BUTTON_TEXT }));

		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		expect(mockCancelTransfers).toHaveBeenCalledWith(1);
		expect(mockRemoteDisconnect).toHaveBeenCalledWith(1);
	});

	it("clearAll externally prevents blocker from reopening dialog (store-based shouldBlockFn)", async () => {
		const user = userEvent.setup();

		act(() => {
			useTransferStore.getState().handleProgress(makeQueuedItem("t1", 1));
		});

		render(
			<I18nWrapper>
				<BrowseRouteShim />
			</I18nWrapper>,
		);

		await user.click(screen.getByTestId("disconnect-btn"));
		expect(screen.getByRole("alertdialog")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: CONFIRM_BUTTON_TEXT }));

		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

		expect(useTransferStore.getState().pendingCount(1)).toBe(0);

		render(
			<I18nWrapper>
				<BrowseRouteShim />
			</I18nWrapper>,
		);

		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});
});
