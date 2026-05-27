import { useState } from "react";
import { t } from "../../../i18n";
import { Icon } from "../icons/Icon";

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
		<section className="h-64 border-t border-outline-variant bg-surface-container flex flex-col shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10">
			{/* Panel Header */}
			<div className="h-12 px-6 flex justify-between items-center border-b border-outline-variant bg-surface-container-highest">
				<div className="flex items-center gap-2">
					<Icon name="sync" size={20} className="text-primary" />
					<h2 className="font-headline-sm text-headline-sm text-on-surface">{t("transfer.active")}</h2>
					<span className="bg-primary-fixed text-primary px-2 py-0.5 rounded font-label-sm text-label-sm ml-2">
						{pendingCount} {t("transfer.pending")}
					</span>
				</div>
				<div className="flex gap-2">
					<button className="p-1.5 rounded hover:bg-surface-container-low text-on-surface-variant transition-colors" title={t("transfer.pauseAll")}>
						<Icon name="sync" size={20} />
					</button>
					<button
						className="p-1.5 rounded hover:bg-surface-container-low text-on-surface-variant transition-colors"
						title={t("transfer.close")}
						onClick={onToggle}
					>
						<Icon name="close" size={20} />
					</button>
				</div>
			</div>

			{/* Queue List */}
			<div className="flex-1 overflow-y-auto p-4 space-y-3">
				{transfers.map((item) => (
					<div
						key={item.id}
						className="bg-surface-container-lowest rounded-lg border border-outline-variant p-4 hover:border-outline transition-colors relative overflow-hidden"
					>
						<div className="flex justify-between items-start mb-2">
							<div className="flex items-center gap-3">
								<Icon
									name="file"
									size={20}
									className={item.status === "uploading" ? "text-tertiary-container" : "text-primary-container"}
								/>
								<div>
									<h3 className="font-label-md text-label-md text-on-surface">{item.name}</h3>
									<p className="font-label-sm text-label-sm text-on-surface-variant">
										{item.source} → {item.dest}
									</p>
								</div>
							</div>
							<div className="text-right">
								<div className="font-label-md text-label-md text-primary">{item.progress}%</div>
								<div className="font-label-sm text-label-sm text-on-surface-variant">
									{item.status === "uploading"
										? `${item.size} @ ${item.speed}`
										: t("transfer.queued")
									}
								</div>
							</div>
						</div>
						<div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
							<div
								className="h-full bg-primary rounded-full transition-all duration-300"
								style={{ width: `${item.progress}%` }}
							/>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
