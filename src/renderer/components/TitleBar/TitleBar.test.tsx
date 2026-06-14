import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { createMockApi } from "@renderer/test/setup";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TitleBar } from "./TitleBar";

describe("TitleBar", () => {
	beforeEach(() => {
		vi.stubGlobal("api", createMockApi());
	});

	it("renders the app title", () => {
		render(
			<I18nWrapper>
				<TitleBar />
			</I18nWrapper>,
		);
		expect(screen.getByText("Remota")).toBeInTheDocument();
	});

	it("renders minimize, maximize, and close buttons", () => {
		render(
			<I18nWrapper>
				<TitleBar />
			</I18nWrapper>,
		);
		expect(screen.getByRole("button", { name: "Minimize" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /maximize/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
	});

	it("calls windowControls.minimize on minimize click", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<TitleBar />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: "Minimize" }));
		expect(window.api.windowControls.minimize).toHaveBeenCalledOnce();
	});

	it("calls windowControls.maximize on maximize click", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<TitleBar />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: /maximize/i }));
		expect(window.api.windowControls.maximize).toHaveBeenCalledOnce();
	});

	it("calls windowControls.close on close click", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<TitleBar />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: "Close" }));
		expect(window.api.windowControls.close).toHaveBeenCalledOnce();
	});

	it("shows restore button when maximized", async () => {
		vi.stubGlobal(
			"api",
			createMockApi({
				windowControls: {
					minimize: vi.fn().mockResolvedValue(undefined),
					maximize: vi.fn().mockResolvedValue(undefined),
					close: vi.fn().mockResolvedValue(undefined),
					isMaximized: vi.fn().mockResolvedValue(true),
					onMaximizeChange: vi.fn().mockReturnValue(vi.fn()),
				},
			}),
		);
		render(
			<I18nWrapper>
				<TitleBar />
			</I18nWrapper>,
		);
		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
		});
	});
});
