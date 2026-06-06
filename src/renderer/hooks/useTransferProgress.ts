import { useTransferStore } from "@renderer/store/transfer";
import type { TransferProgressEvent } from "@shared/types";
import { useEffect } from "react";

export function useTransferProgress(): void {
	const handleProgress = useTransferStore((s) => s.handleProgress);

	useEffect(() => {
		const unsubscribe = window.api.filesystem.onTransferProgress((event: TransferProgressEvent) => {
			handleProgress(event);
		});
		return unsubscribe;
	}, [handleProgress]);
}
