import { useLayoutEffect, useRef, useState, useCallback } from "react";
import type { BreadcrumbSegment } from "../components/FileBrowser/BreadcrumbTypes";

export function useBreadcrumbMeasure(allSegments: BreadcrumbSegment[]) {
	const containerRef = useRef<HTMLDivElement>(null);
	const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const [hiddenStart, setHiddenStart] = useState(1);
	const [hiddenEnd, setHiddenEnd] = useState(0);

	const measure = useCallback(() => {
		const container = containerRef.current;
		if (!container) return;

		const containerWidth = container.clientWidth;
		const gapPx = 4;
		const ellipsisWidth = 40;
		const minHiddenEnd = allSegments.length > 1 ? 1 : 0;

		let totalWidth = 0;
		const widths: number[] = [];

		for (let i = 0; i < allSegments.length; i++) {
			const el = segmentRefs.current[i];
			const w = el ? el.getBoundingClientRect().width : 60;
			widths.push(w);
			totalWidth += w + gapPx;
		}
		totalWidth -= gapPx;

		if (totalWidth <= containerWidth) {
			setHiddenStart(1);
			setHiddenEnd(0);
			return;
		}

		const rootWidth = widths[0];

		for (let end = minHiddenEnd; end <= allSegments.length; end++) {
			let visibleWidth = rootWidth + gapPx;
			const lastCount = end;

			if (lastCount < allSegments.length - 1) {
				visibleWidth += ellipsisWidth + gapPx;
			}

			for (let i = allSegments.length - lastCount; i < allSegments.length; i++) {
				visibleWidth += widths[i] + gapPx;
			}
			visibleWidth -= gapPx;

			if (visibleWidth <= containerWidth) {
				setHiddenStart(1);
				setHiddenEnd(end > 0 ? allSegments.length - end - 1 : 0);
				return;
			}
		}

		setHiddenStart(1);
		setHiddenEnd(allSegments.length - 2);
	}, [allSegments]);

	useLayoutEffect(() => {
		measure();

		const container = containerRef.current;
		if (!container) return;

		const observer = new ResizeObserver(() => { measure(); });
		observer.observe(container);
		return () => { observer.disconnect(); };
	}, [measure]);

	const showEllipsis = hiddenEnd > 0 && hiddenStart < hiddenEnd;

	const headSegments = showEllipsis
		? allSegments.filter((_, i) => i <= hiddenStart)
		: allSegments;

	const tailSegments = showEllipsis
		? allSegments.filter((_, i) => i > hiddenEnd)
		: [];

	return { containerRef, segmentRefs, showEllipsis, headSegments, tailSegments };
}
