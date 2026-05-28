import { t } from "../../../i18n";
import { Button } from "../ui/button";

interface DeleteConfirmDialogProps {
	title: string;
	description: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export function DeleteConfirmDialog({ title, description, onConfirm, onCancel }: DeleteConfirmDialogProps) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="bg-card border border-outline-variant rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
				<h3 className="text-base font-semibold text-card-foreground mb-2">{title}</h3>
				<p className="text-sm text-muted-foreground mb-5">{description}</p>
				<div className="flex items-center justify-end gap-2">
					<Button variant="outline" onClick={onCancel}>
						{t("connection.cancel")}
					</Button>
					<Button variant="destructive" onClick={onConfirm}>
						{t("connection.delete")}
					</Button>
				</div>
			</div>
		</div>
	);
}
