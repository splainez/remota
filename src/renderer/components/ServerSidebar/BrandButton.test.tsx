import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { BrandButton } from "./BrandButton";

describe("BrandButton", () => {
	it("renders the app title when not collapsed", () => {
		render(
			<I18nWrapper>
				<BrandButton collapsed={false} onViewAll={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.getByText("OpenSCP")).toBeInTheDocument();
	});

	it("hides text content when collapsed", () => {
		render(
			<I18nWrapper>
				<BrandButton collapsed={true} onViewAll={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.queryByText("OpenSCP")).not.toBeInTheDocument();
	});

	it("calls onViewAll on click", async () => {
		const user = userEvent.setup();
		const onViewAll = vi.fn();
		render(
			<I18nWrapper>
				<BrandButton collapsed={false} onViewAll={onViewAll} />
			</I18nWrapper>,
		);
		await user.click(screen.getByTitle("OpenSCP"));
		expect(onViewAll).toHaveBeenCalledOnce();
	});

	it("calls onViewAll on Enter key", async () => {
		const user = userEvent.setup();
		const onViewAll = vi.fn();
		render(
			<I18nWrapper>
				<BrandButton collapsed={false} onViewAll={onViewAll} />
			</I18nWrapper>,
		);
		const brandButton = screen.getByTitle("OpenSCP");
		brandButton.focus();
		await user.keyboard("{Enter}");
		expect(onViewAll).toHaveBeenCalled();
	});

	it("calls onViewAll on Space key", async () => {
		const user = userEvent.setup();
		const onViewAll = vi.fn();
		render(
			<I18nWrapper>
				<BrandButton collapsed={false} onViewAll={onViewAll} />
			</I18nWrapper>,
		);
		const brandButton = screen.getByTitle("OpenSCP");
		brandButton.focus();
		await user.keyboard(" ");
		expect(onViewAll).toHaveBeenCalled();
	});
});
