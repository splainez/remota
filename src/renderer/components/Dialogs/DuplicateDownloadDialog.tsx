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
import { useEffect } from "react";

export type DuplicateDecision = "restart" | "keep" | "cancel";

export interface DuplicateDownloadDialogProps {
	open: boolean;
	fileName: string;
	direction?: "download" | "upload";
	onResolve: (decision: DuplicateDecision) => void;
}

export function DuplicateDownloadDialog({
	open,
	fileName,
	direction = "download",
	onResolve,
}: DuplicateDownloadDialogProps) {
	const { t } = useI18n();
	const isUpload = direction === "upload";

	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent): void => {
			const key = e.key.toLowerCase();
			if (key === "escape") {
				e.preventDefault();
				onResolve("cancel");
			} else if (key === "r") {
				e.preventDefault();
				onResolve("restart");
			} else if (key === "k") {
				e.preventDefault();
				onResolve("keep");
			}
		};
		document.addEventListener("keydown", handler);
		return () => {
			document.removeEventListener("keydown", handler);
		};
	}, [open, onResolve]);

	return (
		<Dialog open={open}>
			<DialogContent showCloseButton={false} className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{isUpload ? t("transfer.duplicate.uploadTitle") : t("transfer.duplicate.title")}</DialogTitle>
					<DialogDescription>
						{isUpload
							? t("transfer.duplicate.uploadDescription", { name: fileName })
							: t("transfer.duplicate.description", { name: fileName })}
					</DialogDescription>
				</DialogHeader>

				<DialogFooter className="sm:flex-wrap">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => {
							onResolve("keep");
						}}
					>
						{t("transfer.duplicate.keep")}
					</Button>
					<Button
						type="button"
						variant="default"
						size="sm"
						onClick={() => {
							onResolve("restart");
						}}
					>
						{t("transfer.duplicate.restart")}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => {
							onResolve("cancel");
						}}
					>
						{t("transfer.duplicate.cancel")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
