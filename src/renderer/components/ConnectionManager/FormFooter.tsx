import { Icon } from "../icons/Icon";
import { Button } from "../ui/button";
import { useI18n } from "../../hooks/useI18n";

interface FormFooterProps {
	onCancel: () => void;
	onSave: () => void;
	onConnect: () => void;
}

export function FormFooter({ onCancel, onSave, onConnect }: FormFooterProps) {
	const { t } = useI18n();
	return (
		<div className="flex items-center justify-end gap-2 pt-2">
			<Button type="button" variant="outline" onClick={onCancel}>
				{t("connection.cancel")}
			</Button>
			<Button type="button" variant="secondary" onClick={onSave}>
				<Icon name="save" size={14} className="mr-1.5" />
				{t("connection.saveConnection")}
			</Button>
			<Button type="button" variant="default" onClick={onConnect}>
				<Icon name="plug" size={14} className="mr-1.5" />
				{t("connection.connect")}
			</Button>
		</div>
	);
}
