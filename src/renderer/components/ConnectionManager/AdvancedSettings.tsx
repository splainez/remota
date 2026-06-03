import { Icon } from "@renderer/components/icons/Icon";
import { FormField } from "./FormField";
import { useI18n } from "@renderer/hooks/useI18n";

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
			<button
				type="button"
				className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-foreground transition-colors"
				onClick={onToggle}
			>
				<Icon name={visible ? "arrow-up" : "arrow-down"} size={14} />
				{t("connection.advancedSettings")}
			</button>
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
