import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@renderer/components/ui/alert-dialog";
import { useI18n } from "@renderer/hooks/useI18n";

interface DisconnectConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirmDisconnect: () => void;
}

export function DisconnectConfirmDialog({ open, onOpenChange, onConfirmDisconnect }: DisconnectConfirmDialogProps) {
	const { t } = useI18n();

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("connection.disconnectConfirmTitle")}</AlertDialogTitle>
					<AlertDialogDescription>{t("connection.disconnectConfirmDescription")}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t("connection.disconnectConfirmKeep")}</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirmDisconnect}>
						{t("connection.disconnectConfirmCancel")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
