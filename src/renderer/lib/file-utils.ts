export function formatSize(bytes: number): string {
	if (bytes === 0) return "";
	const units = ["B", "KB", "MB", "GB", "TB"];
	let i = 0;
	let size = bytes;
	while (size >= 1024 && i < units.length - 1) {
		size /= 1024;
		i++;
	}
	return i === 0 ? `${String(size)} ${units[i]}` : `${size.toFixed(1)} ${units[i]}`;
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
