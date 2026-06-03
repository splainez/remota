import type { BreadcrumbProps, BreadcrumbSegment } from "./BreadcrumbTypes";
import { cn, parsePath } from "@renderer/lib/utils";
import { useBreadcrumbMeasure } from "@renderer/hooks/useBreadcrumbMeasure";

export function Breadcrumb({ path, onNavigate, className }: BreadcrumbProps) {
	const allSegments = parsePath(path);

	const { containerRef, segmentRefs, showEllipsis, headSegments, tailSegments } = useBreadcrumbMeasure(allSegments);

	const renderSegment = (seg: BreadcrumbSegment, _idx: number, isLast: boolean) => (
		<span key={seg.path} className="flex items-center gap-1 shrink-0">
			<button
				className="px-1 py-0.5 border border-transparent rounded text-foreground text-sm whitespace-nowrap shrink-0 hover:bg-surface-container-high hover:border-outline-variant"
				onClick={() => {
					onNavigate(seg.path);
				}}
				title={seg.path}
			>
				{seg.label}
			</button>
			{!isLast && seg.path !== "/" && <span className="text-muted-foreground text-sm shrink-0">/</span>}
		</span>
	);

	return (
		<div
			className={cn(
				"flex items-center gap-1 overflow-hidden shrink-0 h-7 px-2 bg-background border-b border-outline-variant",
				className,
			)}
			ref={containerRef}
		>
			{headSegments.map((seg, i) => renderSegment(seg, i, !showEllipsis && i === headSegments.length - 1))}
			{showEllipsis && (
				<span className="flex items-center gap-1 shrink-0">
					<button
						className="px-1 py-0.5 border border-transparent rounded text-muted-foreground text-sm cursor-default whitespace-nowrap shrink-0"
						disabled
						title={allSegments.map((s) => s.path).join(" / ")}
					>
						...
					</button>
					<span className="text-muted-foreground text-sm shrink-0">/</span>
				</span>
			)}
			{tailSegments.map((seg, i) => renderSegment(seg, i, i === tailSegments.length - 1))}

			{/* Hidden segments for measurement */}
			<span
				className="absolute invisible pointer-events-none whitespace-nowrap flex gap-1 -top-[9999px] left-0"
				aria-hidden="true"
			>
				{allSegments.map((seg, i) => (
					<button
						key={seg.path}
						ref={(el) => {
							segmentRefs.current[i] = el;
						}}
						className="px-1 py-0.5 border border-transparent rounded text-foreground text-sm whitespace-nowrap shrink-0 hover:bg-surface-container-high hover:border-outline-variant"
					>
						{seg.label}
					</button>
				))}
			</span>
		</div>
	);
}
