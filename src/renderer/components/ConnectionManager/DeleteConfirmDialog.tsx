import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";

interface DeleteConfirmDialogProps {
	title: string;
	description: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export function DeleteConfirmDialog({ title, description, onConfirm, onCancel }: DeleteConfirmDialogProps) {
	const { t } = useI18n();
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="mx-4 w-full max-w-sm rounded-xl border border-outline-variant bg-card p-6 shadow-xl">
				<h3 className="mb-2 text-base font-semibold text-card-foreground">{title}</h3>
				<p className="mb-5 text-sm text-muted-foreground">{description}</p>
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
