import { Icon, type IconName } from "@renderer/components/icons/Icon";
import { cn } from "@renderer/lib/utils";
import { type ButtonHTMLAttributes, type HTMLAttributes } from "react";

interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	icon?: IconName;
	iconSize?: number;
	variant?: "default" | "destructive";
	selected?: boolean;
}

function MenuItem({
	className,
	icon,
	iconSize = 14,
	variant = "default",
	selected = false,
	children,
	type = "button",
	...props
}: MenuItemProps) {
	return (
		<button
			type={type}
			role="menuitem"
			data-slot="menu-item"
			data-variant={variant}
			data-selected={selected ? "" : undefined}
			className={cn(
				"flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
				variant === "destructive"
					? "text-destructive hover:bg-destructive/10"
					: selected
						? "bg-primary/10 text-primary hover:bg-surface-container-high"
						: "text-popover-foreground hover:bg-surface-container-high",
				className,
			)}
			{...props}
		>
			{icon && <Icon name={icon} size={iconSize} />}
			{children}
		</button>
	);
}

function MenuItemSeparator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			role="separator"
			data-slot="menu-item-separator"
			className={cn("my-1 h-px bg-outline-variant", className)}
			{...props}
		/>
	);
}

export { MenuItem, MenuItemSeparator };
