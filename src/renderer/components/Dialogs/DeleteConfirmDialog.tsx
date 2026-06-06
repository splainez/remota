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

export type DeleteDecision = "delete" | "deleteAll" | "cancel";

export interface DeleteConfirmDialogProps {
	open: boolean;
	itemName: string;
	remaining: number;
	onResolve: (decision: DeleteDecision) => void;
}

export function DeleteConfirmDialog({ open, itemName, remaining, onResolve }: DeleteConfirmDialogProps) {
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
				onResolve("delete");
			} else if (key === "a") {
				e.preventDefault();
				onResolve("deleteAll");
			}
		};
		document.addEventListener("keydown", handler);
		return () => {
			document.removeEventListener("keydown", handler);
		};
	}, [open, onResolve]);

	const showBulk = remaining > 1;

	return (
		<Dialog open={open}>
			<DialogContent showCloseButton={false} className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{showBulk ? t("file.delete.titleMultiple") : t("file.delete.title")}</DialogTitle>
					<DialogDescription>
						{showBulk
							? t("file.delete.descriptionMultiple", { name: itemName, count: String(remaining) })
							: t("file.delete.description", { name: itemName })}
					</DialogDescription>
				</DialogHeader>

				{showBulk && <div className="text-xs text-muted-foreground">{`${String(remaining)} ${t("file.items")}`}</div>}

				<DialogFooter className="sm:flex-wrap">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => {
							onResolve("cancel");
						}}
					>
						{t("file.delete.cancel")}
					</Button>
					{showBulk && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								onResolve("cancel");
							}}
						>
							{t("file.delete.noToAll")}
						</Button>
					)}
					<Button
						type="button"
						variant="destructive"
						size="sm"
						onClick={() => {
							onResolve("delete");
						}}
					>
						{t("file.delete.yes")}
					</Button>
					{showBulk && (
						<Button
							type="button"
							variant="destructive"
							size="sm"
							onClick={() => {
								onResolve("deleteAll");
							}}
						>
							{t("file.delete.yesToAll")}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
