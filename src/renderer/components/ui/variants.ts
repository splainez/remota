import { cva } from "class-variance-authority";

export const badgeVariants = cva(
	`
		group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border
		border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all
		focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50
		has-data-[icon=inline-end]:pr-1.5
		has-data-[icon=inline-start]:pl-1.5
		aria-invalid:border-destructive aria-invalid:ring-destructive/20
		dark:aria-invalid:ring-destructive/40
		[&>svg]:pointer-events-none [&>svg]:size-3!
	`,
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
				secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
				destructive: `
					bg-destructive/10 text-destructive
					focus-visible:ring-destructive/20
					dark:bg-destructive/20
					dark:focus-visible:ring-destructive/40
					[a]:hover:bg-destructive/20
				`,
				outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
				ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
				link: "text-primary underline-offset-4 hover:underline",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export const buttonGroupVariants = cva(
	`
		flex w-fit items-stretch
		*:focus-visible:relative *:focus-visible:z-10
		has-[>[data-slot=button-group]]:gap-2
		has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-lg
		[&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit
		[&>input]:flex-1
	`,
	{
		variants: {
			orientation: {
				horizontal: `
					*:data-slot:rounded-r-none
					[&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-lg!
					[&>[data-slot]~[data-slot]]:rounded-l-none [&>[data-slot]~[data-slot]]:border-l-0
				`,
				vertical: `
					flex-col
					*:data-slot:rounded-b-none
					[&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-lg!
					[&>[data-slot]~[data-slot]]:rounded-t-none [&>[data-slot]~[data-slot]]:border-t-0
				`,
			},
		},
		defaultVariants: {
			orientation: "horizontal",
		},
	},
);

export const buttonVariants = cva(
	`
		group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding
		text-sm font-medium whitespace-nowrap transition-all outline-none select-none
		focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50
		active:not-aria-[haspopup]:translate-y-px
		disabled:pointer-events-none disabled:opacity-50
		aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20
		dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40
		[&_svg]:pointer-events-none [&_svg]:shrink-0
		[&_svg:not([class*='size-'])]:size-4
	`,
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
				primary: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
				outline: `
					border-border bg-background
					hover:bg-muted hover:text-foreground
					aria-expanded:bg-muted aria-expanded:text-foreground
					dark:border-input dark:bg-input/30
					dark:hover:bg-input/50
				`,
				secondary: `
					bg-secondary text-secondary-foreground
					hover:bg-secondary/80
					aria-expanded:bg-secondary aria-expanded:text-secondary-foreground
				`,
				ghost:
					"hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
				selected:
					"border-primary bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15 dark:hover:bg-primary/20",
				destructive: `
					bg-destructive/10 text-destructive
					hover:bg-destructive/20
					focus-visible:border-destructive/40 focus-visible:ring-destructive/20
					dark:bg-destructive/20
					dark:hover:bg-destructive/30
					dark:focus-visible:ring-destructive/40
				`,
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
				xs: `
					h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs
					in-data-[slot=button-group]:rounded-lg
					has-data-[icon=inline-end]:pr-1.5
					has-data-[icon=inline-start]:pl-1.5
					[&_svg:not([class*='size-'])]:size-3
				`,
				sm: `
					h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem]
					in-data-[slot=button-group]:rounded-lg
					has-data-[icon=inline-end]:pr-1.5
					has-data-[icon=inline-start]:pl-1.5
					[&_svg:not([class*='size-'])]:size-3.5
				`,
				lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
				icon: "size-8",
				"icon-xs": `
					size-6 rounded-[min(var(--radius-md),10px)]
					in-data-[slot=button-group]:rounded-lg
					[&_svg:not([class*='size-'])]:size-3
				`,
				"icon-sm": "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
				"icon-lg": "size-9",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export const tabsListVariants = cva(
	`
		group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground
		group-data-horizontal/tabs:h-8
		group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col
		data-[variant=line]:rounded-none
	`,
	{
		variants: {
			variant: {
				default: "bg-muted",
				line: "gap-1 bg-transparent",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export const toggleVariants = cva(
	`
		group/toggle inline-flex items-center justify-center gap-1 rounded-lg text-sm font-medium whitespace-nowrap
		transition-all outline-none
		hover:bg-muted hover:text-foreground
		focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50
		disabled:pointer-events-none disabled:opacity-50
		aria-invalid:border-destructive aria-invalid:ring-destructive/20
		aria-pressed:bg-muted
		data-[state=on]:bg-muted
		dark:aria-invalid:ring-destructive/40
		[&_svg]:pointer-events-none [&_svg]:shrink-0
		[&_svg:not([class*='size-'])]:size-4
	`,
	{
		variants: {
			variant: {
				default: "bg-transparent",
				outline: "border border-input bg-transparent hover:bg-muted",
			},
			size: {
				default: "h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
				sm: `
					h-7 min-w-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem]
					has-data-[icon=inline-end]:pr-1.5
					has-data-[icon=inline-start]:pl-1.5
					[&_svg:not([class*='size-'])]:size-3.5
				`,
				lg: "h-9 min-w-9 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);
