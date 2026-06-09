import { useSettingsStore } from "@renderer/store/settings";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
		availableTerminals: [],
		pendingRecoveryToast: null,
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
		useSettingsStore.setState({ availableTerminals: ["kitty", "alacritty"] });
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
		useSettingsStore.setState({ externalTerminal: "kitty", availableTerminals: ["kitty"] });
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
		useSettingsStore.setState({ externalTerminal: "ghostty", availableTerminals: ["ghostty"] });
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
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

	// --- availability / not-found suffix ---

	it("disables terminal options that are not in availableTerminals", () => {
		useSettingsStore.setState({ availableTerminals: ["kitty"] });
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		const kittyButton = screen.getByRole("button", { name: /Kitty/ });
		const alacrittyButton = screen.getByRole("button", { name: /Alacritty/ });
		const ghosttyButton = screen.getByRole("button", { name: /Ghostty/ });
		const noneButton = screen.getByRole("button", { name: /None/ });

		expect(kittyButton).not.toBeDisabled();
		expect(alacrittyButton).toBeDisabled();
		expect(ghosttyButton).toBeDisabled();
		expect(noneButton).not.toBeDisabled();
	});

	it("shows the 'not found on this system' suffix on disabled options only", () => {
		useSettingsStore.setState({ availableTerminals: ["kitty"] });
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		const suffixRegex = /not found on this system/i;
		const allSuffixes = screen.getAllByText(suffixRegex);
		// Available options: none, kitty (no suffix). Unavailable: the other 7 terminals.
		expect(allSuffixes.length).toBe(7);

		// Verify the kitty option does not have the suffix inside its label.
		const kittyButton = screen.getByText("Kitty").closest("button");
		expect(kittyButton?.textContent).not.toMatch(suffixRegex);
	});

	it("clicking a disabled terminal does not call setExternalTerminal", async () => {
		useSettingsStore.setState({ availableTerminals: ["kitty"] });
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		// Alacritty is disabled; user.click is silently no-op for disabled buttons.
		await user.click(screen.getByText("Alacritty"));
		expect(useSettingsStore.getState().externalTerminal).toBeUndefined();
	});

	it("keeps a saved-but-now-unavailable terminal visually selected with the not-found suffix", () => {
		useSettingsStore.setState({ externalTerminal: "alacritty", availableTerminals: ["kitty"] });
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		const alacrittyButton = screen.getByRole("button", { name: /Alacritty/ });
		expect(alacrittyButton).toBeDisabled();
		expect(alacrittyButton.className).toMatch(/border-primary/);
		expect(alacrittyButton.className).toContain("cursor-not-allowed");
		expect(alacrittyButton.textContent).toMatch(/not found on this system/i);
	});

	// --- recovery toast ---

	it("shows a warning toast when pendingRecoveryToast is set, then clears it", async () => {
		const { toast } = await import("sonner");
		const warningSpy = vi.spyOn(toast, "warning").mockImplementation(() => "");

		useSettingsStore.setState({
			pendingRecoveryToast: "alacritty",
			availableTerminals: ["kitty"],
		});
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);

		await waitFor(() => {
			expect(warningSpy).toHaveBeenCalledTimes(1);
		});
		expect(warningSpy.mock.calls[0][0]).toContain("Alacritty");
		await waitFor(() => {
			expect(useSettingsStore.getState().pendingRecoveryToast).toBeNull();
		});

		warningSpy.mockRestore();
	});

	it("does not show a toast when pendingRecoveryToast is null", async () => {
		const { toast } = await import("sonner");
		const warningSpy = vi.spyOn(toast, "warning").mockImplementation(() => "");

		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);

		// Give the effect a tick to run (it should not).
		await new Promise((r) => setTimeout(r, 10));
		expect(warningSpy).not.toHaveBeenCalled();

		warningSpy.mockRestore();
	});

	// --- SSH config import ---

	it("renders SSH Config Import section with two buttons", () => {
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.getByText("Import SSH Config")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Import from default/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Import from file/ })).toBeInTheDocument();
	});

	it("calls importSshConfig when clicking default import button", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: /Import from default/ }));
		expect(window.api.connections.importSshConfig).toHaveBeenCalledOnce();
	});

	it("calls importSshConfigFile when clicking file import button", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: /Import from file/ }));
		expect(window.api.connections.importSshConfigFile).toHaveBeenCalledOnce();
	});

	it("shows success toast after importing connections", async () => {
		const { toast } = await import("sonner");
		const successSpy = vi.spyOn(toast, "success").mockImplementation(() => "");
		(window.api.connections.importSshConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ imported: 3, errors: [] });

		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: /Import from default/ }));

		await waitFor(() => {
			expect(successSpy).toHaveBeenCalledOnce();
		});
		expect(successSpy.mock.calls[0][0]).toContain("3");

		successSpy.mockRestore();
	});

	it("shows warning toast when import has partial errors", async () => {
		const { toast } = await import("sonner");
		const warningSpy = vi.spyOn(toast, "warning").mockImplementation(() => "");
		(window.api.connections.importSshConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
			imported: 2,
			errors: ["Failed to import bad-host"],
		});

		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: /Import from default/ }));

		await waitFor(() => {
			expect(warningSpy).toHaveBeenCalledOnce();
		});

		warningSpy.mockRestore();
	});

	it("shows error toast when import fails completely", async () => {
		const { toast } = await import("sonner");
		const errorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
		(window.api.connections.importSshConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
			imported: 0,
			errors: ["Could not read file"],
		});

		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: /Import from default/ }));

		await waitFor(() => {
			expect(errorSpy).toHaveBeenCalledOnce();
		});

		errorSpy.mockRestore();
	});

	it("shows no toast when import is cancelled (empty result)", async () => {
		const { toast } = await import("sonner");
		const successSpy = vi.spyOn(toast, "success").mockImplementation(() => "");
		const warningSpy = vi.spyOn(toast, "warning").mockImplementation(() => "");
		const errorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
		(window.api.connections.importSshConfigFile as ReturnType<typeof vi.fn>).mockResolvedValue({
			imported: 0,
			errors: [],
		});

		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: /Import from file/ }));

		await new Promise((r) => setTimeout(r, 50));
		expect(successSpy).not.toHaveBeenCalled();
		expect(warningSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();

		successSpy.mockRestore();
		warningSpy.mockRestore();
		errorSpy.mockRestore();
	});

	// --- SSH config export ---

	it("renders SSH Config Export section with two buttons", () => {
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.getByText("Export SSH Config")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Export to default/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Export to file/ })).toBeInTheDocument();
	});

	it("calls exportSshConfig when clicking default export button", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: /Export to default/ }));
		expect(window.api.connections.exportSshConfig).toHaveBeenCalledOnce();
	});

	it("calls exportSshConfigFile when clicking file export button", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: /Export to file/ }));
		expect(window.api.connections.exportSshConfigFile).toHaveBeenCalledOnce();
	});

	it("shows success toast after exporting connections", async () => {
		const { toast } = await import("sonner");
		const successSpy = vi.spyOn(toast, "success").mockImplementation(() => "");
		(window.api.connections.exportSshConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ exported: 5, errors: [] });

		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: /Export to default/ }));

		await waitFor(() => {
			expect(successSpy).toHaveBeenCalledOnce();
		});
		expect(successSpy.mock.calls[0][0]).toContain("5");

		successSpy.mockRestore();
	});

	it("shows warning toast when export has partial errors", async () => {
		const { toast } = await import("sonner");
		const warningSpy = vi.spyOn(toast, "warning").mockImplementation(() => "");
		(window.api.connections.exportSshConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
			exported: 2,
			errors: ["Could not write file"],
		});

		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: /Export to default/ }));

		await waitFor(() => {
			expect(warningSpy).toHaveBeenCalledOnce();
		});

		warningSpy.mockRestore();
	});

	it("shows error toast when export fails completely", async () => {
		const { toast } = await import("sonner");
		const errorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
		(window.api.connections.exportSshConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
			exported: 0,
			errors: ["Permission denied"],
		});

		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: /Export to default/ }));

		await waitFor(() => {
			expect(errorSpy).toHaveBeenCalledOnce();
		});

		errorSpy.mockRestore();
	});

	it("shows no toast when export is cancelled (empty result)", async () => {
		const { toast } = await import("sonner");
		const successSpy = vi.spyOn(toast, "success").mockImplementation(() => "");
		const warningSpy = vi.spyOn(toast, "warning").mockImplementation(() => "");
		const errorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
		(window.api.connections.exportSshConfigFile as ReturnType<typeof vi.fn>).mockResolvedValue({
			exported: 0,
			errors: [],
		});

		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SettingsView onBack={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: /Export to file/ }));

		await new Promise((r) => setTimeout(r, 50));
		expect(successSpy).not.toHaveBeenCalled();
		expect(warningSpy).not.toHaveBeenCalled();
		expect(errorSpy).not.toHaveBeenCalled();

		successSpy.mockRestore();
		warningSpy.mockRestore();
		errorSpy.mockRestore();
	});
});
