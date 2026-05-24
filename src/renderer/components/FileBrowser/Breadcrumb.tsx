import { useCallback, useLayoutEffect, useRef, useState } from "react";

interface BreadcrumbSegment {
  label: string;
  path: string;
}

interface BreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

export function parsePath(input: string): BreadcrumbSegment[] {
  const isWindows = /^[a-zA-Z]:\\/.test(input);
  const sep = isWindows ? "\\" : "/";

  const parts = input.split(sep).filter(Boolean);

  if (sep === "\\") {
    const segments: BreadcrumbSegment[] = [];
    if (parts.length > 0) {
      const root = parts[0].endsWith(":") ? parts[0] : parts[0] + sep;
      segments.push({ label: root + sep, path: root + sep });

      let acc = root + sep;
      for (let i = 1; i < parts.length; i++) {
        acc = acc + parts[i] + sep;
        segments.push({ label: parts[i], path: acc.replace(/\\$/, "") });
      }
    }
    return segments;
  }

  const segments: BreadcrumbSegment[] = [{ label: "/", path: "/" }];
  let acc = "";
  for (const part of parts) {
    acc += "/" + part;
    segments.push({ label: part, path: acc });
  }
  return segments;
}

export function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [hiddenStart, setHiddenStart] = useState(1);
  const [hiddenEnd, setHiddenEnd] = useState(0);

  const allSegments = parsePath(path);

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

    const observer = new ResizeObserver(() => {
      measure();
    });
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

  const renderSegment = (seg: BreadcrumbSegment, _idx: number, isLast: boolean) => (
    <span key={seg.path} className="flex items-center gap-1 shrink-0">
      <button
        className="px-1 py-0.5 border border-transparent rounded text-gray-900 text-sm whitespace-nowrap shrink-0 hover:bg-gray-300 hover:border-gray-300"
        onClick={() => { onNavigate(seg.path); }}
        title={seg.path}
      >
        {seg.label}
      </button>
      {!isLast && <span className="text-gray-500 text-sm shrink-0">/</span>}
    </span>
  );

  return (
    <div className="flex items-center gap-1 overflow-hidden shrink-0 h-7 px-2 bg-white border-b border-gray-300" ref={containerRef}>
      {headSegments.map((seg, i) =>
        renderSegment(seg, i, !showEllipsis && i === headSegments.length - 1)
      )}
      {showEllipsis && (
        <span className="flex items-center gap-1 shrink-0">
          <button
            className="px-1 py-0.5 border border-transparent rounded text-gray-500 text-sm cursor-default whitespace-nowrap shrink-0"
            disabled
            title={allSegments.map((s) => s.path).join(" / ")}
          >
            ...
          </button>
          <span className="text-gray-500 text-sm shrink-0">/</span>
        </span>
      )}
      {tailSegments.map((seg, i) =>
        renderSegment(seg, i, i === tailSegments.length - 1)
      )}

      {/* Hidden segments for measurement */}
      <span className="absolute invisible pointer-events-none whitespace-nowrap flex gap-1 -top-[9999px] left-0" aria-hidden="true">
        {allSegments.map((seg, i) => (
          <button
            key={seg.path}
            ref={(el) => {
              segmentRefs.current[i] = el;
            }}
            className="px-1 py-0.5 border border-transparent rounded text-gray-900 text-sm whitespace-nowrap shrink-0 hover:bg-gray-300 hover:border-gray-300"
          >
            {seg.label}
          </button>
        ))}
      </span>
    </div>
  );
}
