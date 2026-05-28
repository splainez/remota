import { create } from "zustand";

interface PlatformStore {
	platform: string;
	isWindows: boolean;
	isLinux: boolean;
	isMacOS: boolean;
	pathSep: string;
}

export const usePlatformStore = create<PlatformStore>(() => {
	const platform = (window as { api?: { platform: string } }).api?.platform ?? "linux";

	return {
		platform,
		isWindows: platform === "win32",
		isLinux: platform === "linux",
		isMacOS: platform === "darwin",
		pathSep: platform === "win32" ? "\\" : "/",
	};
});
