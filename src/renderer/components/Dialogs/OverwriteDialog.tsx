import { Button } from "@renderer/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@renderer/components/ui/dialog";
import { useI18n } from "@renderer/hooks/useI18n";
import { formatSize } from "@renderer/lib/file-utils";
import { useEffect } from "react";

export type OverwriteDecision = "overwrite" | "skip" | "cancel" | "overwriteAll" | "skipAll";

export interface OverwriteDialogProps {
	open: boolean;
	fileName: string;
	localPath: string;
	remotePath: string;
	localSize: number | null;
	localModified: string | null;
	remoteSize: number;
	remoteModified: string;
	remaining: number;
	onResolve: (decision: OverwriteDecision) => void;
}

function formatModified(iso: string | null): string {
	if (!iso) return "\u2014";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "\u2014";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function OverwriteDialog({
	open,
	fileName,
	localPath,
	localSize,
	localModified,
	remoteSize,
	remoteModified,
	remaining,
	onResolve,
}: OverwriteDialogProps) {
	const { t } = useI18n();

	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent): void => {
			const key = e.key.toLowerCase();
			if (key === "escape") {
				e.preventDefault();
				onResolve("cancel");
			} else if (key === "y") {
				e.preventDefault();
				onResolve("overwrite");
			} else if (key === "n") {
				e.preventDefault();
				onResolve("skip");
			} else if (key === "a") {
				e.preventDefault();
				onResolve("overwriteAll");
			} else if (key === "o") {
				e.preventDefault();
				onResolve("skipAll");
			}
		};
		document.addEventListener("keydown", handler);
		return () => {
			document.removeEventListener("keydown", handler);
		};
	}, [open, onResolve]);

	const showBulk = remaining > 1;
	const dash = "\u2014";

	return (
		<Dialog open={open}>
			<DialogContent showCloseButton={false} className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("transfer.overwrite.title")}</DialogTitle>
					<DialogDescription>{t("transfer.overwrite.description", { name: fileName })}</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-3 gap-2 text-xs">
					<div />
					<div className="text-center font-semibold text-muted-foreground">{t("transfer.overwrite.local")}</div>
					<div className="text-center font-semibold text-muted-foreground">{t("transfer.overwrite.remote")}</div>

					<div className="text-muted-foreground">{t("transfer.overwrite.size")}</div>
					<div className="text-center text-foreground">{localSize === null ? dash : formatSize(localSize)}</div>
					<div className="text-center text-foreground">{formatSize(remoteSize)}</div>

					<div className="text-muted-foreground">{t("transfer.overwrite.modified")}</div>
					<div className="text-center text-foreground">{formatModified(localModified)}</div>
					<div className="text-center text-foreground">{formatModified(remoteModified)}</div>

					<div className="text-muted-foreground">Path</div>
					<div className="col-span-2 truncate text-foreground" title={localPath}>
						{localPath}
					</div>
				</div>

				<div className="text-xs text-muted-foreground">
					{showBulk ? `${String(remaining)} ${t("transfer.pending").toLowerCase()}` : null}
				</div>

				<DialogFooter className="sm:flex-wrap">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => {
							onResolve("skip");
						}}
					>
						{t("transfer.overwrite.skip")}
					</Button>
					{showBulk && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								onResolve("skipAll");
							}}
						>
							{t("transfer.overwrite.skipAll")}
						</Button>
					)}
					<Button
						type="button"
						variant="default"
						size="sm"
						onClick={() => {
							onResolve("overwrite");
						}}
					>
						{t("transfer.overwrite.overwrite")}
					</Button>
					{showBulk && (
						<Button
							type="button"
							variant="default"
							size="sm"
							onClick={() => {
								onResolve("overwriteAll");
							}}
						>
							{t("transfer.overwrite.overwriteAll")}
						</Button>
					)}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => {
							onResolve("cancel");
						}}
					>
						{t("transfer.overwrite.cancel")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
