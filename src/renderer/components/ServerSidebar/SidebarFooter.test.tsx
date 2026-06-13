import { SidebarProvider } from "@renderer/components/ui/sidebar";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ServerSidebarFooter } from "./SidebarFooter";

vi.mock("../../hooks/useTheme", () => ({
	useTheme: () => ({
		theme: "dark" as const,
		setTheme: vi.fn(),
	}),
}));

describe("ServerSidebarFooter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders collapse button with arrow-left when expanded", () => {
		render(
			<I18nWrapper>
				<SidebarProvider>
					<ServerSidebarFooter onSettings={vi.fn()} />
				</SidebarProvider>
			</I18nWrapper>,
		);
		const collapseBtn = screen.getByRole("button", { name: "Collapse sidebar" });
		expect(collapseBtn).toBeInTheDocument();
	});

	it("renders collapse button with arrow-right when collapsed", () => {
		render(
			<I18nWrapper>
				<SidebarProvider defaultOpen={false}>
					<ServerSidebarFooter onSettings={vi.fn()} />
				</SidebarProvider>
			</I18nWrapper>,
		);
		const expandBtn = screen.getByRole("button", { name: "Expand sidebar" });
		expect(expandBtn).toBeInTheDocument();
	});

	it("calls toggleSidebar on collapse click", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<SidebarProvider>
					<ServerSidebarFooter onSettings={vi.fn()} />
				</SidebarProvider>
			</I18nWrapper>,
		);
		const collapseBtn = screen.getByRole("button", { name: "Collapse sidebar" });
		await user.click(collapseBtn);
		const expandBtn = screen.getByRole("button", { name: "Expand sidebar" });
		expect(expandBtn).toBeInTheDocument();
	});

	it("shows theme and settings when expanded", () => {
		render(
			<I18nWrapper>
				<SidebarProvider>
					<ServerSidebarFooter onSettings={vi.fn()} />
				</SidebarProvider>
			</I18nWrapper>,
		);
		const buttons = screen.getAllByRole("button");
		expect(buttons.length).toBe(3); // collapse + theme + settings
	});

	it("shows settings and hides theme when collapsed", () => {
		render(
			<I18nWrapper>
				<SidebarProvider defaultOpen={false}>
					<ServerSidebarFooter onSettings={vi.fn()} />
				</SidebarProvider>
			</I18nWrapper>,
		);
		const buttons = screen.getAllByRole("button");
		expect(buttons.length).toBe(1); // expand only (settings hidden when collapsed)
	});
});
