
export interface BreadcrumbSegment {
	label: string;
	path: string;
}

export interface BreadcrumbProps {
	path: string;
	onNavigate: (path: string) => void;
	className?: string;
}
