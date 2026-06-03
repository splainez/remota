import { useState } from "react";
import { Icon } from "@renderer/components/icons/Icon";
import { useI18n } from "@renderer/hooks/useI18n";

interface TransferItem {
	id: string;
	name: string;
	source: string;
	dest: string;
	progress: number;
	status: "uploading" | "queued";
	size?: string;
	speed?: string;
}

const MOCK_TRANSFERS: TransferItem[] = [
	{
		id: "1",
		name: "main.8f4b2c.js",
		source: "src/build",
		dest: "/var/www/html/assets",
		progress: 45,
		status: "uploading",
		size: "12.5 MB / 28.0 MB",
		speed: "2.4 MB/s",
	},
	{
		id: "2",
		name: "styles.css",
		source: "src/css",
		dest: "/var/www/html/css",
		progress: 0,
		status: "queued",
		size: "450 KB",
	},
];

interface TransferRowProps {
	item: TransferItem;
}

function TransferRow({ item }: TransferRowProps) {
	const { t } = useI18n();
	return (
		<div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-3 hover:border-outline transition-colors relative overflow-hidden">
			<div className="flex justify-between items-start mb-1.5">
				<div className="flex items-center gap-2">
					<Icon
						name="file"
						size={16}
						className={item.status === "uploading" ? "text-tertiary-container" : "text-primary-container"}
					/>
					<div>
						<h3 className="text-xs font-semibold text-on-surface">{item.name}</h3>
						<p className="text-xs text-on-surface-variant">
							{item.source} → {item.dest}
						</p>
					</div>
				</div>
				<div className="text-right">
					<div className="text-xs font-semibold text-primary">{item.progress}%</div>
					<div className="text-xs text-on-surface-variant">
						{item.status === "uploading" ? `${item.size ?? ""} @ ${item.speed ?? ""}` : t("transfer.queued")}
					</div>
				</div>
			</div>
			<div className="h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
				<div
					className="h-full bg-primary rounded-full transition-all duration-300"
					style={{ width: `${String(item.progress)}%` }}
				/>
			</div>
		</div>
	);
}

interface TransferHeaderProps {
	pendingCount: number;
	onClose: () => void;
}

function TransferHeader({ pendingCount, onClose }: TransferHeaderProps) {
	const { t } = useI18n();
	return (
		<div className="h-10 px-4 flex justify-between items-center border-b border-outline-variant bg-surface-container-highest">
			<div className="flex items-center gap-2">
				<Icon name="sync" size={16} className="text-primary" />
				<h2 className="text-sm font-semibold text-on-surface">{t("transfer.active")}</h2>
				<span className="bg-primary-fixed text-primary px-1.5 py-0.5 rounded text-xs ml-1">
					{pendingCount} {t("transfer.pending")}
				</span>
			</div>
			<div className="flex gap-1">
				<button
					className="p-1 rounded hover:bg-surface-container-low text-on-surface-variant transition-colors"
					title={t("transfer.pauseAll")}
				>
					<Icon name="sync" size={16} />
				</button>
				<button
					className="p-1 rounded hover:bg-surface-container-low text-on-surface-variant transition-colors"
					title={t("transfer.close")}
					onClick={onClose}
				>
					<Icon name="close" size={16} />
				</button>
			</div>
		</div>
	);
}

interface ActiveTransfersProps {
	visible: boolean;
	onToggle: () => void;
}

export function ActiveTransfers({ visible, onToggle }: ActiveTransfersProps) {
	const [transfers] = useState<TransferItem[]>(MOCK_TRANSFERS);

	if (!visible) {
		return null;
	}

	const pendingCount = transfers.filter((t) => t.status === "queued").length;

	return (
		<section className="h-52 border-t border-outline-variant bg-surface-container flex flex-col shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10">
			<TransferHeader pendingCount={pendingCount} onClose={onToggle} />

			{/* Queue List */}
			<div className="flex-1 overflow-y-auto p-3 space-y-2">
				{transfers.map((item) => (
					<TransferRow key={item.id} item={item} />
				))}
			</div>
		</section>
	);
}
