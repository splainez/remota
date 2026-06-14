import { SidebarProvider } from "@renderer/components/ui/sidebar";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { BrandButton } from "./BrandButton";

describe("BrandButton", () => {
	it("renders the app title when expanded", () => {
		render(
			<I18nWrapper>
				<SidebarProvider>
					<BrandButton onViewAll={vi.fn()} />
				</SidebarProvider>
			</I18nWrapper>,
		);
		expect(screen.getByText("Remota")).toBeInTheDocument();
	});

	it("hides text content when collapsed", () => {
		render(
			<I18nWrapper>
				<SidebarProvider defaultOpen={false}>
					<BrandButton onViewAll={vi.fn()} />
				</SidebarProvider>
			</I18nWrapper>,
		);
		expect(screen.queryByText("Remota")).not.toBeInTheDocument();
	});

	it("calls onViewAll on click", async () => {
		const user = userEvent.setup();
		const onViewAll = vi.fn();
		render(
			<I18nWrapper>
				<SidebarProvider>
					<BrandButton onViewAll={onViewAll} />
				</SidebarProvider>
			</I18nWrapper>,
		);
		await user.click(screen.getByTitle("Remota"));
		expect(onViewAll).toHaveBeenCalledOnce();
	});

	it("calls onViewAll on Enter key", async () => {
		const user = userEvent.setup();
		const onViewAll = vi.fn();
		render(
			<I18nWrapper>
				<SidebarProvider>
					<BrandButton onViewAll={onViewAll} />
				</SidebarProvider>
			</I18nWrapper>,
		);
		const brandButton = screen.getByTitle("Remota");
		brandButton.focus();
		await user.keyboard("{Enter}");
		expect(onViewAll).toHaveBeenCalled();
	});

	it("calls onViewAll on Space key", async () => {
		const user = userEvent.setup();
		const onViewAll = vi.fn();
		render(
			<I18nWrapper>
				<SidebarProvider>
					<BrandButton onViewAll={onViewAll} />
				</SidebarProvider>
			</I18nWrapper>,
		);
		const brandButton = screen.getByTitle("Remota");
		brandButton.focus();
		await user.keyboard(" ");
		expect(onViewAll).toHaveBeenCalled();
	});
});
