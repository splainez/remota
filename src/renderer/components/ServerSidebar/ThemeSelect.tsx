import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { MenuItem } from "@renderer/components/ui/menu-item";
import { useI18n } from "@renderer/hooks/useI18n";
import { useTheme } from "@renderer/hooks/useTheme";
import { cn } from "@renderer/lib/utils";
import { useState, useRef, useEffect } from "react";

export function ThemeSelect() {
	const { t } = useI18n();
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
			<Button
				variant="ghost"
				size="icon"
				className="rounded-full text-on-surface-variant hover:rounded-xl hover:text-primary"
				aria-label={t("theme.change")}
				title={t("theme.change")}
				aria-haspopup="menu"
				aria-expanded={open}
				onClick={() => {
					setOpen((v) => !v);
				}}
			>
				<Icon name="layout" size={16} />
			</Button>
			{open && (
				<div
					role="menu"
					className="
						absolute bottom-full left-0 z-50 mb-1 w-36 overflow-hidden rounded-lg border border-outline-variant
						bg-popover shadow-lg
					"
				>
					{options.map((opt) => (
						<MenuItem
							key={opt.value}
							selected={theme === opt.value}
							onClick={() => {
								setTheme(opt.value);
								setOpen(false);
							}}
						>
							<span
								className={cn(
									"size-2 rounded-full",
									theme === opt.value ? "bg-primary" : "border border-outline-variant bg-transparent",
								)}
							/>
							{opt.label}
						</MenuItem>
					))}
				</div>
			)}
		</div>
	);
}
