import { useI18n } from "@renderer/hooks/useI18n";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "./ui/alert-dialog";

export interface QuitConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirmQuit: () => void;
}

export function QuitConfirmDialog({ open, onOpenChange, onConfirmQuit }: QuitConfirmDialogProps) {
	const { t } = useI18n();

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("app.quitConfirmTitle")}</AlertDialogTitle>
					<AlertDialogDescription>{t("app.quitConfirmDescription")}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t("app.quitConfirmCancel")}</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirmQuit}>
						{t("app.quitConfirmQuit")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
