import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ConnectionErrorView } from "./ConnectionErrorView";
import { I18nWrapper } from "../../test/i18n-wrapper";

describe("ConnectionErrorView", () => {
	it("renders the connection lost message and technical detail", () => {
		render(
			<I18nWrapper>
				<ConnectionErrorView technicalDetail="ECONNREFUSED 127.0.0.1:22" />
			</I18nWrapper>,
		);
		expect(screen.getByText("ECONNREFUSED 127.0.0.1:22")).toBeInTheDocument();
	});

	it("shows reconnect button when onReconnect is provided", () => {
		render(
			<I18nWrapper>
				<ConnectionErrorView technicalDetail="Error" onReconnect={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("does not show reconnect button when onReconnect is not provided", () => {
		render(
			<I18nWrapper>
				<ConnectionErrorView technicalDetail="Error" />
			</I18nWrapper>,
		);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("calls onReconnect when reconnect button is clicked", async () => {
		const user = userEvent.setup();
		const onReconnect = vi.fn();
		render(
			<I18nWrapper>
				<ConnectionErrorView technicalDetail="Error" onReconnect={onReconnect} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button"));
		expect(onReconnect).toHaveBeenCalledOnce();
	});
});
