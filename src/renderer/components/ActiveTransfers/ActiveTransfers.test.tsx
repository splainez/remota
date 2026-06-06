import { useTransferPanelStore } from "@renderer/store/transferPanel";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { ActiveTransfers } from "./ActiveTransfers";

describe("ActiveTransfers", () => {
	beforeEach(() => {
		useTransferPanelStore.setState({ visibility: {}, loaded: false });
	});

	it("renders the active transfers header", () => {
		render(
			<I18nWrapper>
				<ActiveTransfers connectionId={1} />
			</I18nWrapper>,
		);
		expect(screen.getByText("Active Transfers")).toBeInTheDocument();
	});

	it("shows empty state by default (no mock data)", () => {
		render(
			<I18nWrapper>
				<ActiveTransfers connectionId={1} />
			</I18nWrapper>,
		);
		expect(screen.getByText(/no active transfers/i)).toBeInTheDocument();
		expect(screen.queryByText("main.8f4b2c.js")).not.toBeInTheDocument();
		expect(screen.queryByText("styles.css")).not.toBeInTheDocument();
		expect(screen.queryByText("45%")).not.toBeInTheDocument();
	});

	it("does not render a pending count badge when nothing is active", () => {
		render(
			<I18nWrapper>
				<ActiveTransfers connectionId={1} />
			</I18nWrapper>,
		);
		expect(screen.queryByText("1")).not.toBeInTheDocument();
		expect(screen.queryByText("0")).not.toBeInTheDocument();
	});

	it("calls setVisible(false) when close button is clicked", async () => {
		const user = userEvent.setup();
		useTransferPanelStore.setState({ visibility: { 1: true } });

		render(
			<I18nWrapper>
				<ActiveTransfers connectionId={1} />
			</I18nWrapper>,
		);
		const closeBtn = screen.getByTitle("Close transfers panel");
		await user.click(closeBtn);

		expect(useTransferPanelStore.getState().isVisible(1)).toBe(false);
	});

	it("persists visibility change via IPC", async () => {
		const setSpy = vi.fn().mockResolvedValue(undefined);
		window.api.transferPanel.set = setSpy;

		const user = userEvent.setup();
		useTransferPanelStore.setState({ visibility: { 5: true } });

		render(
			<I18nWrapper>
				<ActiveTransfers connectionId={5} />
			</I18nWrapper>,
		);
		const closeBtn = screen.getByTitle("Close transfers panel");
		await user.click(closeBtn);

		await act(async () => {
			await Promise.resolve();
		});
		expect(setSpy).toHaveBeenCalledWith(5, { visible: false });
	});

	it("renders the clear button label", () => {
		render(
			<I18nWrapper>
				<ActiveTransfers connectionId={1} />
			</I18nWrapper>,
		);
		expect(screen.getByText("Clear completed")).toBeInTheDocument();
	});
});
