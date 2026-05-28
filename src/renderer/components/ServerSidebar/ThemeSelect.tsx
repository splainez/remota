import { useState, useRef, useEffect } from "react";
import { t } from "../../../i18n";
import { Icon } from "../icons/Icon";
import { useTheme } from "../../hooks/useTheme";

export function ThemeSelect() {
	const { theme, setTheme } = useTheme();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => {
			document.removeEventListener("mousedown", handleClick);
		};
	}, []);

	const options: { value: "dark" | "light" | "system"; label: string }[] = [
		{ value: "dark", label: t("theme.dark") },
		{ value: "light", label: t("theme.light") },
		{ value: "system", label: t("theme.system") },
	];

	return (
		<div ref={ref} className="relative">
			<button
				className="w-10 h-10 rounded-full hover:bg-surface-container hover:rounded-xl transition-all duration-300 flex items-center justify-center text-on-surface-variant hover:text-primary"
				title={t("theme.change")}
				onClick={() => {
					setOpen((v) => !v);
				}}
			>
				<Icon name="layout" size={16} />
			</button>
			{open && (
				<div className="absolute bottom-full left-0 mb-1 w-36 bg-popover border border-outline-variant rounded-lg shadow-lg overflow-hidden z-50">
					{options.map((opt) => (
						<button
							key={opt.value}
							className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors ${theme === opt.value ? "text-primary bg-primary/10" : "text-popover-foreground"}`}
							onClick={() => {
								setTheme(opt.value);
								setOpen(false);
							}}
						>
							<span
								className={`w-2 h-2 rounded-full ${theme === opt.value ? "bg-primary" : "bg-transparent border border-outline-variant"}`}
							/>
							{opt.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
