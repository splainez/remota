import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";

import { FormField } from "./FormField";

interface FieldProps<T = string> {
	state: { value: T; meta: { errors: unknown[] } };
	handleBlur: () => void;
	handleChange: (v: T) => void;
}

const inputClass =
	"px-3 py-[7px] border border-input rounded-lg bg-background text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 w-full";

interface AdvancedSettingsProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: any;
	visible: boolean;
	onToggle: () => void;
}

export function AdvancedSettings({ form, visible, onToggle }: AdvancedSettingsProps) {
	const { t } = useI18n();
	return (
		<div className="border-t border-outline-variant pt-4">
			<Button
				type="button"
				variant="link"
				size="sm"
				className="h-auto p-0 text-sm text-primary transition-colors hover:text-primary-foreground"
				onClick={onToggle}
			>
				<Icon name={visible ? "arrow-up" : "arrow-down"} size={14} />
				{t("connection.advancedSettings")}
			</Button>
			{visible && (
				<div className="mt-3 grid grid-cols-2 gap-4">
					<form.Field name="groupName">
						{(field: FieldProps) => (
							<FormField label={t("connection.group")} htmlFor="conn-group">
								<input
									id="conn-group"
									className={inputClass}
									type="text"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => {
										field.handleChange(e.target.value);
									}}
									placeholder={t("connection.groupPlaceholder")}
								/>
							</FormField>
						)}
					</form.Field>
				</div>
			)}
		</div>
	);
}
