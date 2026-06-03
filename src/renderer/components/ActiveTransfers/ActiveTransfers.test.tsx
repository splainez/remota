import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { ActiveTransfers } from "./ActiveTransfers";

describe("ActiveTransfers", () => {
	it("returns null when not visible", () => {
		const { container } = render(
			<I18nWrapper>
				<ActiveTransfers visible={false} onToggle={vi.fn()} />
			</I18nWrapper>,
		);
		expect(container.innerHTML).toBe("");
	});

	it("renders transfer header and items when visible", () => {
		render(
			<I18nWrapper>
				<ActiveTransfers visible={true} onToggle={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.getByText("main.8f4b2c.js")).toBeInTheDocument();
		expect(screen.getByText("styles.css")).toBeInTheDocument();
	});

	it("displays pending count", () => {
		render(
			<I18nWrapper>
				<ActiveTransfers visible={true} onToggle={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.getByText("1 Pending")).toBeInTheDocument();
	});

	it("calls onToggle when close button is clicked", async () => {
		const user = userEvent.setup();
		const onToggle = vi.fn();
		render(
			<I18nWrapper>
				<ActiveTransfers visible={true} onToggle={onToggle} />
			</I18nWrapper>,
		);
		const closeBtn = screen.getByTitle("Close transfers panel");
		await user.click(closeBtn);
		expect(onToggle).toHaveBeenCalledOnce();
	});

	it("renders progress bar for uploading item", () => {
		render(
			<I18nWrapper>
				<ActiveTransfers visible={true} onToggle={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.getByText("45%")).toBeInTheDocument();
	});

	it("renders queued status for non-uploading items", () => {
		render(
			<I18nWrapper>
				<ActiveTransfers visible={true} onToggle={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.getByText("Queued")).toBeInTheDocument();
	});

	it("shows source to destination path", () => {
		render(
			<I18nWrapper>
				<ActiveTransfers visible={true} onToggle={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.getByText("src/build", { exact: false })).toBeInTheDocument();
		expect(screen.getByText("/var/www/html/assets", { exact: false })).toBeInTheDocument();
	});
});
