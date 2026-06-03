import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ThemeSelect } from "./ThemeSelect";
import { I18nWrapper } from "../../test/i18n-wrapper";

const mockSetTheme = vi.fn();

vi.mock("../../hooks/useTheme", () => ({
	useTheme: () => ({
		theme: "dark" as const,
		setTheme: mockSetTheme,
	}),
}));

describe("ThemeSelect", () => {
	it("renders the theme toggle button", () => {
		render(
			<I18nWrapper>
				<ThemeSelect />
			</I18nWrapper>,
		);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("opens dropdown on click", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<ThemeSelect />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button"));
		expect(screen.getByText("Dark")).toBeInTheDocument();
		expect(screen.getByText("Light")).toBeInTheDocument();
		expect(screen.getByText("System")).toBeInTheDocument();
	});

	it("calls setTheme and closes dropdown on option click", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<ThemeSelect />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button"));
		await user.click(screen.getByText("Light"));
		expect(mockSetTheme).toHaveBeenCalledWith("light");
		expect(screen.queryByText("Dark")).not.toBeInTheDocument();
	});

	it("closes dropdown on outside click", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<div>
					<ThemeSelect />
					<div data-testid="outside">outside</div>
				</div>
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button"));
		expect(screen.getByText("Dark")).toBeInTheDocument();
		await user.click(screen.getByTestId("outside"));
		expect(screen.queryByText("Dark")).not.toBeInTheDocument();
	});

	it("highlights active theme option", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<ThemeSelect />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button"));
		const darkOption = screen.getByText("Dark").closest("button");
		expect(darkOption?.className).toContain("bg-primary/10");
	});
});
