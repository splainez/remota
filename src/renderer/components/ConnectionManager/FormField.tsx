import type { ReactNode } from "react";
import { type TranslationKey } from "@i18n/i18n";
import { useI18n } from "@renderer/hooks/useI18n";

interface FormFieldProps {
	label: string;
	required?: boolean;
	htmlFor?: string;
	children: ReactNode;
	errors?: unknown[];
	icon?: ReactNode;
}

function errorMessage(err: unknown, t: (key: TranslationKey) => string): string {
	if (err !== null && typeof err === "object" && "message" in err) {
		const msg = String(err.message);
		if (msg.length > 0) return t(msg as TranslationKey);
	}
	if (typeof err === "string" && err.length > 0) return t(err as TranslationKey);
	return t("validation.default");
}

const labelClass = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
const requiredLabelClass = `${labelClass} after:content-['_*'] after:text-destructive after:ml-0.5`;
const errorClass = "text-xs text-destructive mt-0.5";

export function FormField({ label, required, htmlFor, children, errors, icon }: FormFieldProps) {
	const { t } = useI18n();
	return (
		<div className="flex flex-col gap-1">
			<label className={required ? requiredLabelClass : labelClass} htmlFor={htmlFor}>
				{label}
			</label>
			<div className={icon ? "relative" : undefined}>
				{icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
				{children}
			</div>
			{errors?.map((err, i) => (
				<span key={i} className={errorClass}>
					{errorMessage(err, t)}
				</span>
			))}
		</div>
	);
}
