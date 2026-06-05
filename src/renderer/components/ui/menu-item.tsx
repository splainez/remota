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
				"w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors",
				variant === "destructive"
					? "hover:bg-destructive/10 text-destructive"
					: selected
						? "hover:bg-surface-container-high text-primary bg-primary/10"
						: "hover:bg-surface-container-high text-popover-foreground",
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
			className={cn("h-px bg-outline-variant my-1", className)}
			{...props}
		/>
	);
}

export { MenuItem, MenuItemSeparator };
