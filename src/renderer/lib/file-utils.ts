const numberFormat2DigitsMax = new Intl.NumberFormat("en-US", {
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

const numberFormat2DigitsFix = new Intl.NumberFormat("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

const unitsSize = ["B", "KiB", "MiB", "GiB", "TiB"];
const unitsSpeed = ["B/s", "KiB/s", "MiB/s", "GiB/s", "TiB/s"];

export function formatSize(bytes: number): string {
	return formatUnit(numberFormat2DigitsMax, bytes, unitsSize);
}

export function formatSpeed(bytesPerSec: number): string {
	if (bytesPerSec <= 0) return "";
	return formatUnit(numberFormat2DigitsFix, bytesPerSec, unitsSpeed);
}

export function formatBytes(bytes: number): string {
	return formatUnit(numberFormat2DigitsFix, bytes, unitsSize);
}

function formatUnit(formatted: Intl.NumberFormat, num: number, units: string[]) {
	if (units.length === 0) {
		return units.toString();
	}
	if (num === 0) {
		return `0 ${units[0]}`;
	}
	let i = 0;
	let size = num;
	while (size >= 1024 && i < units.length - 1) {
		size /= 1024;
		i++;
	}
	const unit = units[i];
	return `${formatted.format(size)}${unit ? ` ${unit}` : ""}`;
}

export function formatDate(iso: string): string {
	if (!iso) return "";
	const d = new Date(iso);
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		if (diffHours < 1) {
			const diffMins = Math.floor(diffMs / (1000 * 60));
			if (diffMins < 1) return "Just now";
			return `${diffMins.toString()} min ago`;
		}
		return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
	}
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 7) return `${diffDays.toString()} days ago`;

	const pad = (n: number) => String(n).padStart(2, "0");
	return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
