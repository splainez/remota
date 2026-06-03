import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { ToggleableError } from "./ToggleableError";
import { I18nWrapper } from "../../test/i18n-wrapper";

describe("ToggleableError", () => {
	it("renders error message", () => {
		render(
			<I18nWrapper>
				<ToggleableError message="Connection failed" />
			</I18nWrapper>,
		);
		expect(screen.getByText("Connection failed")).toBeInTheDocument();
	});

	it("does not show details button when no detail", () => {
		render(
			<I18nWrapper>
				<ToggleableError message="Connection failed" />
			</I18nWrapper>,
		);
		expect(screen.queryByText("Show details")).not.toBeInTheDocument();
	});

	it("shows details button when detail is provided", () => {
		render(
			<I18nWrapper>
				<ToggleableError message="Connection failed" detail="ECONNREFUSED 127.0.0.1:22" />
			</I18nWrapper>,
		);
		expect(screen.getByText("Show details")).toBeInTheDocument();
	});

	it("toggles detail visibility on click", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<ToggleableError message="Connection failed" detail="ECONNREFUSED 127.0.0.1:22" />
			</I18nWrapper>,
		);

		await user.click(screen.getByText("Show details"));
		expect(screen.getByText("ECONNREFUSED 127.0.0.1:22")).toBeInTheDocument();
		expect(screen.getByText("Hide details")).toBeInTheDocument();

		await user.click(screen.getByText("Hide details"));
		expect(screen.queryByText("ECONNREFUSED 127.0.0.1:22")).not.toBeInTheDocument();
	});
});
