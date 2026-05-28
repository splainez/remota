import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BreadcrumbSegment } from "../components/FileBrowser/BreadcrumbTypes";

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

export function canGoUp(path: string): boolean {
	if (path === "/") return false;
	if (/^[a-zA-Z]:\\$/.test(path)) return false;
	return true;
}

export function matchesWildcard(pattern: string, filename: string): boolean {
	if (!pattern.trim()) return true;
	const hasWildcard = pattern.includes("*");
	const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
	const body = escaped.replace(/\*/g, ".*");
	const regex = new RegExp(hasWildcard ? `^${body}$` : `.*${body}.*`, "i");
	return regex.test(filename);
}

export function parsePath(input: string): BreadcrumbSegment[] {
	const isWindows = /^[a-zA-Z]:\\/.test(input);
	const sep = isWindows ? "\\" : "/";

	const parts = input.split(sep).filter(Boolean);

	if (sep === "\\") {
		const segments: BreadcrumbSegment[] = [];
		if (parts.length > 0) {
			const root = parts[0].endsWith(":") ? parts[0] : parts[0] + sep;
			segments.push({ label: root, path: root + sep });

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
