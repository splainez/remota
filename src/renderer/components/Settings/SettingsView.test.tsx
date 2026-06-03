import { useSettingsStore } from "@renderer/store/settings";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SettingsView } from "./SettingsView";

vi.mock("@renderer/hooks/useTheme", () => ({
	useTheme: () => ({
		theme: "system" as const,
		setTheme: vi.fn(),
	}),
}));

function resetStore() {
	useSettingsStore.setState({
		theme: "system",
		locale: "en",
		externalTerminal: undefined,
		loaded: true,
	});
}

describe("SettingsView", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetStore();
	});

	it("renders title, back button, and all sections", () => {
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.getByText("Settings")).toBeInTheDocument();
		expect(screen.getByText("Appearance")).toBeInTheDocument();
		expect(screen.getByText("Language")).toBeInTheDocument();
		expect(screen.getByText("Terminal")).toBeInTheDocument();
	});

	it("renders all terminal options including 'None'", () => {
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.getByText("None (integrated terminal)")).toBeInTheDocument();
		expect(screen.getByText("Windows Terminal")).toBeInTheDocument();
		expect(screen.getByText("Kitty")).toBeInTheDocument();
		expect(screen.getByText("Ghostty")).toBeInTheDocument();
		expect(screen.getByText("Alacritty")).toBeInTheDocument();
		expect(screen.getByText("iTerm2")).toBeInTheDocument();
		expect(screen.getByText("Terminal.app")).toBeInTheDocument();
		expect(screen.getByText("GNOME Terminal")).toBeInTheDocument();
		expect(screen.getByText("Konsole")).toBeInTheDocument();
	});

	it("calls onBack when the back button is clicked", async () => {
		const onBack = vi.fn();
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SettingsView onBack={onBack} />
			</I18nWrapper>,
		);
		await user.click(screen.getByLabelText("Back"));
		expect(onBack).toHaveBeenCalledOnce();
	});

	it("selects 'None' by default and stores undefined externalTerminal", () => {
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		expect(useSettingsStore.getState().externalTerminal).toBeUndefined();
	});

	it("selecting a terminal calls setExternalTerminal with the right value", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByText("Kitty"));
		expect(useSettingsStore.getState().externalTerminal).toBe("kitty");
	});

	it("selecting 'None' clears the external terminal back to undefined", async () => {
		useSettingsStore.setState({ externalTerminal: "kitty" });
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByText("None (integrated terminal)"));
		expect(useSettingsStore.getState().externalTerminal).toBeUndefined();
	});

	it("reflects an already-saved externalTerminal as the active option", () => {
		useSettingsStore.setState({ externalTerminal: "ghostty" });
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		// Both "None" and "Ghostty" buttons are rendered; check the Ghostty button has the active style
		const ghosttyButton = screen.getByText("Ghostty").closest("button");
		expect(ghosttyButton?.className).toContain("border-primary");
	});

	it("renders terminal description text", () => {
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.getByText("External Terminal")).toBeInTheDocument();
	});
});
