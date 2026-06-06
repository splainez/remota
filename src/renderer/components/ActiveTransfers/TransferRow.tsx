import type { TranslationKey } from "@i18n/i18n";
import { Icon, type IconName } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";
import { formatBytes, formatSpeed } from "@renderer/lib/file-utils";
import type { TransferItem } from "@renderer/store/transfer";
import { useCallback } from "react";

function statusLabelKey(status: TransferItem["status"]): TranslationKey {
	switch (status) {
		case "queued":
			return "transfer.item.queued";
		case "active":
			return "transfer.item.active";
		case "completed":
			return "transfer.item.completed";
		case "failed":
			return "transfer.item.failed";
		case "cancelled":
			return "transfer.item.cancelled";
	}
}

function statusIcon(status: TransferItem["status"]): IconName {
	switch (status) {
		case "queued":
			return "record";
		case "active":
			return "sync";
		case "completed":
			return "check";
		case "failed":
			return "error";
		case "cancelled":
			return "close";
	}
}

function statusTone(status: TransferItem["status"]): string {
	switch (status) {
		case "completed":
			return "text-primary";
		case "failed":
			return "text-destructive";
		case "cancelled":
			return "text-on-surface-variant";
		case "active":
		case "queued":
			return "text-on-surface";
	}
}

function statusIsSpinning(status: TransferItem["status"]): boolean {
	return status === "active";
}

interface TransferRowProps {
	item: TransferItem;
	totalLabel: string;
	speed: number;
	onCancel: (jobId: string, itemId: string) => void;
}

export function TransferRow({ item, totalLabel, speed, onCancel }: TransferRowProps) {
	const { t } = useI18n();
	const percent = item.totalBytes > 0 ? Math.min(100, Math.round((item.transferredBytes / item.totalBytes) * 100)) : 0;
	const transferredLabel = item.transferredBytes > 0 || item.totalBytes > 0 ? formatBytes(item.transferredBytes) : "";
	const speedLabel = item.status === "active" && speed > 0 ? formatSpeed(speed) : "";

	const canCancel = item.status === "queued" || item.status === "active";

	const handleCancel = useCallback(() => {
		onCancel(item.jobId, item.id);
	}, [onCancel, item.jobId, item.id]);

	return (
		<div className="bg-surface-container-low rounded-md border border-outline-variant p-2 flex flex-col gap-1">
			<div className="flex items-center gap-2 min-w-0">
				<Icon
					name={statusIcon(item.status)}
					size={14}
					className={`${statusTone(item.status)} ${statusIsSpinning(item.status) ? "animate-spin" : ""} shrink-0`}
				/>
				<span className={`text-sm font-medium truncate ${statusTone(item.status)}`} title={item.name}>
					{item.name}
				</span>
				{canCancel && (
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={t("transfer.cancel")}
						title={t("transfer.cancel")}
						onClick={handleCancel}
						className="shrink-0 ml-auto"
					>
						<Icon name="close" size={14} />
					</Button>
				)}
				{!canCancel && (
					<span className="text-xs text-on-surface-variant ml-auto shrink-0">{t(statusLabelKey(item.status))}</span>
				)}
			</div>
			{item.error !== undefined && (
				<div className="text-xs text-destructive truncate" title={item.error}>
					{item.error}
				</div>
			)}
			<div className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
				<div
					className="h-full bg-primary transition-all"
					style={{ width: `${String(percent)}%` }}
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={percent}
				/>
			</div>
			<div className="flex justify-between text-xs text-on-surface-variant tabular-nums">
				<span className="truncate" title={item.target}>
					{item.target}
				</span>
				<span className="shrink-0 ml-2">
					{item.status === "active" || item.status === "completed" ? (
						<>
							<span>{t("transfer.item.bytes", { transferred: transferredLabel, total: totalLabel })}</span>
							{speedLabel !== "" ? (
								<>
									<span>—</span>
									<span>{speedLabel}</span>
								</>
							) : undefined}
						</>
					) : undefined}
				</span>
			</div>
		</div>
	);
}
