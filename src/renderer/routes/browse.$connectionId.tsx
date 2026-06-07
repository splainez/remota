/* eslint-disable react-refresh/only-export-components -- route config + component co-location is Tanstack Router convention */
import { DisconnectConfirmDialog } from "@renderer/components/FileBrowser/DisconnectConfirmDialog";
import { FileBrowser } from "@renderer/components/FileBrowser/FileBrowser";
import { useConnections } from "@renderer/hooks/useConnections";
import { useTransferStore } from "@renderer/store/transfer";
import { createRoute, useBlocker, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { rootRoute } from "./__root";

export const browseRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/browse/$connectionId",
	component: BrowseRoute,
});

function BrowseRoute() {
	const { connectionId } = browseRoute.useParams();
	const router = useRouter();
	const { connections } = useConnections();

	const connId = Number(connectionId);
	const connection = connections.find((c) => c.id === connId) ?? null;

	const hasActiveTransfers = useTransferStore((s) => s.pendingCount(connId) > 0);

	const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
	const [blockedLocation, setBlockedLocation] = useState<string | null>(null);

	const { status, next, reset } = useBlocker({
		shouldBlockFn: () => hasActiveTransfers,
		enableBeforeUnload: true,
		withResolver: true,
	});

	if (status === "blocked") {
		setBlockedLocation(next.fullPath);
		reset();
	}

	const handleConfirmDisconnect = () => {
		void window.api.filesystem.cancelTransfersForConnection(connId);
		void window.api.filesystem.remoteDisconnect(connId);
		setDisconnectDialogOpen(false);
		const target = blockedLocation ?? "/";
		setBlockedLocation(null);
		void router.navigate({ to: target });
	};

	const handleDisconnect = () => {
		if (hasActiveTransfers) {
			setDisconnectDialogOpen(true);
			return;
		}
		void window.api.filesystem.remoteDisconnect(connId);
		void router.navigate({ to: "/" });
	};

	if (connection == null) {
		return (
			<div className="flex-1 flex items-center justify-center bg-surface overflow-auto">
				<div className="text-muted-foreground">Connection not found</div>
			</div>
		);
	}

	return (
		<>
			<DisconnectConfirmDialog
				open={disconnectDialogOpen}
				onOpenChange={setDisconnectDialogOpen}
				onConfirmDisconnect={handleConfirmDisconnect}
			/>
			<FileBrowser connection={connection} onDisconnect={handleDisconnect} />
		</>
	);
}
