import type { Settings, TerminalAppId } from "@shared/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSettingsStore } from "./settings";

function resetStore() {
	useSettingsStore.setState({
		theme: "system",
		locale: "en",
		externalTerminal: undefined,
		loaded: false,
		availableTerminals: [],
		pendingRecoveryToast: null,
	});
}

function setSettingsResponse(settings: Partial<Settings>) {
	window.api.settings.getAll = vi.fn().mockResolvedValue({
		theme: settings.theme ?? "system",
		locale: settings.locale ?? "en",
		externalTerminal: settings.externalTerminal,
	});
}

function setDetected(terminals: TerminalAppId[]) {
	window.api.terminal.detectInstalled = vi.fn().mockResolvedValue(terminals);
}

describe("useSettingsStore.load", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetStore();
	});

	it("loads settings and available terminals", async () => {
		setSettingsResponse({ theme: "dark", locale: "es", externalTerminal: "kitty" });
		setDetected(["kitty", "alacritty"]);

		await useSettingsStore.getState().load();

		const state = useSettingsStore.getState();
		expect(state.theme).toBe("dark");
		expect(state.locale).toBe("es");
		expect(state.externalTerminal).toBe("kitty");
		expect(state.availableTerminals).toEqual(["kitty", "alacritty"]);
		expect(state.pendingRecoveryToast).toBeNull();
		expect(state.loaded).toBe(true);
	});

	it("keeps externalTerminal when it is in availableTerminals", async () => {
		setSettingsResponse({ externalTerminal: "ghostty" });
		setDetected(["ghostty", "kitty"]);

		await useSettingsStore.getState().load();

		expect(useSettingsStore.getState().externalTerminal).toBe("ghostty");
		expect(useSettingsStore.getState().pendingRecoveryToast).toBeNull();
	});

	it("resets externalTerminal to undefined when not in availableTerminals", async () => {
		setSettingsResponse({ externalTerminal: "alacritty" });
		setDetected(["kitty"]);

		await useSettingsStore.getState().load();

		const state = useSettingsStore.getState();
		expect(state.externalTerminal).toBeUndefined();
		expect(state.pendingRecoveryToast).toBe("alacritty");
	});

	it("persists the externalTerminal reset via settings.set", async () => {
		const setSpy = vi.fn().mockResolvedValue({ theme: "system", locale: "en" });
		window.api.settings.set = setSpy;
		setSettingsResponse({ externalTerminal: "alacritty" });
		setDetected(["kitty"]);

		await useSettingsStore.getState().load();

		expect(setSpy).toHaveBeenCalledWith({ externalTerminal: undefined });
	});

	it("does not persist anything when externalTerminal is still available", async () => {
		const setSpy = vi.fn().mockResolvedValue({ theme: "system", locale: "en" });
		window.api.settings.set = setSpy;
		setSettingsResponse({ externalTerminal: "kitty" });
		setDetected(["kitty"]);

		await useSettingsStore.getState().load();

		expect(setSpy).not.toHaveBeenCalled();
	});

	it("continues loading when detectInstalled rejects (treats as empty)", async () => {
		setSettingsResponse({ externalTerminal: "kitty" });
		window.api.terminal.detectInstalled = vi.fn().mockRejectedValue(new Error("ipc failed"));

		await useSettingsStore.getState().load();

		const state = useSettingsStore.getState();
		expect(state.loaded).toBe(true);
		expect(state.externalTerminal).toBeUndefined();
		expect(state.availableTerminals).toEqual([]);
		expect(state.pendingRecoveryToast).toBe("kitty");
	});

	it("still marks the store as loaded when getAll rejects (boots with defaults)", async () => {
		window.api.settings.getAll = vi.fn().mockRejectedValue(new Error("corrupt config"));
		setDetected(["kitty"]);

		await useSettingsStore.getState().load();

		const state = useSettingsStore.getState();
		expect(state.loaded).toBe(true);
		expect(state.theme).toBe("system");
		expect(state.locale).toBe("en");
		expect(state.externalTerminal).toBeUndefined();
	});

	it("does not set pendingRecoveryToast when no externalTerminal was saved", async () => {
		setSettingsResponse({ externalTerminal: undefined });
		setDetected(["kitty"]);

		await useSettingsStore.getState().load();

		expect(useSettingsStore.getState().pendingRecoveryToast).toBeNull();
	});
});

describe("useSettingsStore.clearPendingRecoveryToast", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetStore();
	});

	it("clears the pendingRecoveryToast", () => {
		useSettingsStore.setState({ pendingRecoveryToast: "alacritty" });
		useSettingsStore.getState().clearPendingRecoveryToast();
		expect(useSettingsStore.getState().pendingRecoveryToast).toBeNull();
	});
});

describe("useSettingsStore setters", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetStore();
	});

	it("setTheme updates state and calls settings.set", () => {
		const setSpy = vi.fn().mockResolvedValue({ theme: "dark", locale: "en" });
		window.api.settings.set = setSpy;

		useSettingsStore.getState().setTheme("dark");
		expect(useSettingsStore.getState().theme).toBe("dark");
		expect(setSpy).toHaveBeenCalledWith({ theme: "dark" });
	});

	it("setLocale updates state and calls settings.set", () => {
		const setSpy = vi.fn().mockResolvedValue({ theme: "system", locale: "es" });
		window.api.settings.set = setSpy;

		useSettingsStore.getState().setLocale("es");
		expect(useSettingsStore.getState().locale).toBe("es");
		expect(setSpy).toHaveBeenCalledWith({ locale: "es" });
	});

	it("setExternalTerminal updates state and calls settings.set", () => {
		const setSpy = vi.fn().mockResolvedValue({ theme: "system", locale: "en", externalTerminal: "kitty" });
		window.api.settings.set = setSpy;

		useSettingsStore.getState().setExternalTerminal("kitty");
		expect(useSettingsStore.getState().externalTerminal).toBe("kitty");
		expect(setSpy).toHaveBeenCalledWith({ externalTerminal: "kitty" });
	});

	it("setExternalTerminal accepts undefined and clears the value", () => {
		useSettingsStore.setState({ externalTerminal: "kitty" });
		const setSpy = vi.fn().mockResolvedValue({ theme: "system", locale: "en" });
		window.api.settings.set = setSpy;

		useSettingsStore.getState().setExternalTerminal(undefined);
		expect(useSettingsStore.getState().externalTerminal).toBeUndefined();
		expect(setSpy).toHaveBeenCalledWith({ externalTerminal: undefined });
	});
});
