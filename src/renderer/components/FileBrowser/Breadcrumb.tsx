import { Button } from "@renderer/components/ui/button";
import { useBreadcrumbMeasure } from "@renderer/hooks/useBreadcrumbMeasure";
import { cn, parsePath } from "@renderer/lib/utils";

import type { BreadcrumbProps, BreadcrumbSegment } from "./BreadcrumbTypes";

export function Breadcrumb({ path, onNavigate, className }: BreadcrumbProps) {
	const allSegments = parsePath(path);

	const { containerRef, segmentRefs, showEllipsis, headSegments, tailSegments } = useBreadcrumbMeasure(allSegments);

	const renderSegment = (seg: BreadcrumbSegment, _idx: number, isLast: boolean) => (
		<span key={seg.path} className="flex shrink-0 items-center gap-1">
			<Button
				variant="ghost"
				size="xs"
				className="text-foreground hover:bg-surface-container-high"
				onClick={() => {
					onNavigate(seg.path);
				}}
				title={seg.path}
			>
				{seg.label}
			</Button>
			{!isLast && seg.path !== "/" && <span className="shrink-0 text-sm text-muted-foreground">/</span>}
		</span>
	);

	return (
		<div
			className={cn(
				"flex h-7 shrink-0 items-center gap-1 overflow-hidden border-b border-outline-variant bg-background px-2",
				className,
			)}
			ref={containerRef}
		>
			{headSegments.map((seg, i) => renderSegment(seg, i, !showEllipsis && i === headSegments.length - 1))}
			{showEllipsis && (
				<span className="flex shrink-0 items-center gap-1">
					<Button
						variant="ghost"
						size="xs"
						className="pointer-events-none cursor-default text-muted-foreground"
						disabled
						title={allSegments.map((s) => s.path).join(" / ")}
					>
						...
					</Button>
					<span className="shrink-0 text-sm text-muted-foreground">/</span>
				</span>
			)}
			{tailSegments.map((seg, i) => renderSegment(seg, i, i === tailSegments.length - 1))}

			{/* Hidden segments for measurement */}
			<span
				className="pointer-events-none invisible absolute top-[-9999px] left-0 flex gap-1 whitespace-nowrap"
				aria-hidden="true"
			>
				{allSegments.map((seg, i) => (
					<Button
						key={seg.path}
						ref={(el) => {
							segmentRefs.current[i] = el;
						}}
						variant="ghost"
						size="xs"
						className="text-foreground hover:bg-surface-container-high"
						tabIndex={-1}
					>
						{seg.label}
					</Button>
				))}
			</span>
		</div>
	);
}
