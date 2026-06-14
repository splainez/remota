import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";
import { useTransferAutoClear } from "@renderer/hooks/useTransferAutoClear";
import { useTransferSpeed } from "@renderer/hooks/useTransferSpeed";
import { formatSize } from "@renderer/lib/file-utils";
import { useTransferStore, type TransferItem } from "@renderer/store/transfer";
import { useTransferPanelStore } from "@renderer/store/transferPanel";
import { useCallback, useMemo } from "react";

import { TransferRow } from "./TransferRow";

interface TransferHeaderProps {
	pendingCount: number;
	onClearCompleted: () => void;
	onCancelAll: () => void;
	onClose: () => void;
}

function TransferHeader({ pendingCount, onClearCompleted, onCancelAll, onClose }: TransferHeaderProps) {
	const { t } = useI18n();
	return (
		<div
			className="
				flex h-10 shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-highest
				px-4
			"
		>
			<div className="flex items-center gap-2">
				<Icon name="sync" size={16} className="text-primary" />
				<h2 className="text-sm font-semibold text-on-surface">{t("transfer.active")}</h2>
				{pendingCount > 0 && (
					<span className="ml-1 rounded-sm bg-primary-fixed px-1.5 py-0.5 text-xs text-primary">{pendingCount}</span>
				)}
			</div>
			<div className="flex gap-1">
				{pendingCount > 0 && (
					<Button
						variant="ghost"
						size="sm"
						aria-label={t("transfer.cancelAll")}
						title={t("transfer.cancelAll")}
						onClick={onCancelAll}
					>
						{t("transfer.cancelAll")}
					</Button>
				)}
				<Button
					variant="ghost"
					size="sm"
					aria-label={t("transfer.clearCompleted")}
					title={t("transfer.clearCompleted")}
					onClick={onClearCompleted}
				>
					{t("transfer.clearCompleted")}
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label={t("transfer.close")}
					title={t("transfer.close")}
					onClick={onClose}
				>
					<Icon name="close" size={16} />
				</Button>
			</div>
		</div>
	);
}

function EmptyState() {
	const { t } = useI18n();
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-on-surface-variant">
			<Icon name="sync" size={32} className="opacity-40" />
			<div className="text-sm font-medium">{t("transfer.empty")}</div>
			<div className="max-w-xs text-center text-xs opacity-80">{t("transfer.emptyHint")}</div>
		</div>
	);
}

interface ActiveTransfersProps {
	connectionId: number;
}

export function ActiveTransfers({ connectionId }: ActiveTransfersProps) {
	const { t } = useI18n();
	useTransferAutoClear(connectionId);
	const getSpeed = useTransferSpeed(connectionId);
	const setVisible = useTransferPanelStore((s) => s.setVisible);
	const rawItems = useTransferStore((s) => s.byConnection[connectionId]);
	const items = useMemo(() => rawItems ?? [], [rawItems]);
	const clearCompleted = useTransferStore((s) => s.clearCompleted);
	const clearAll = useTransferStore((s) => s.clearAll);

	const pendingCount = useMemo(
		() => items.filter((i) => i.status === "queued" || i.status === "active").length,
		[items],
	);

	const handleClose = useCallback(() => {
		setVisible(connectionId, false);
	}, [connectionId, setVisible]);

	const handleClearCompleted = useCallback(() => {
		clearCompleted(connectionId);
	}, [clearCompleted, connectionId]);

	const handleClearAll = useCallback(() => {
		clearAll(connectionId);
	}, [clearAll, connectionId]);

	const handleCancelAll = useCallback(() => {
		void window.api.filesystem.cancelAllTransfers();
	}, []);

	const handleCancelItem = useCallback((jobId: string, itemId: string) => {
		void window.api.filesystem.cancelTransfer(jobId, itemId);
	}, []);

	const sorted: TransferItem[] = useMemo(() => {
		const order: Record<TransferItem["status"], number> = {
			active: 0,
			queued: 1,
			failed: 2,
			cancelled: 3,
			completed: 4,
		};
		return items.slice().sort((a, b) => {
			const s = order[a.status] - order[b.status];
			if (s !== 0) return s;
			return a.name.localeCompare(b.name);
		});
	}, [items]);

	return (
		<section className="flex h-full min-h-0 flex-col bg-surface-container">
			<TransferHeader
				pendingCount={pendingCount}
				onClearCompleted={pendingCount === 0 ? handleClearAll : handleClearCompleted}
				onCancelAll={handleCancelAll}
				onClose={handleClose}
			/>
			{sorted.length === 0 ? (
				<div className="min-h-0 flex-1 overflow-y-auto p-3" aria-label={t("transfer.active")}>
					<EmptyState />
				</div>
			) : (
				<div className="min-h-0 flex-1 overflow-y-auto p-3" aria-label={t("transfer.active")}>
					<ul className="flex flex-col gap-2">
						{sorted.map((item) => (
							<li key={item.id}>
								<TransferRow
									item={item}
									totalLabel={formatSize(item.totalBytes)}
									speed={getSpeed(item.id)}
									onCancel={handleCancelItem}
								/>
							</li>
						))}
					</ul>
				</div>
			)}
		</section>
	);
}
