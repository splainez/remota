/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { AdvancedSettings } from "./AdvancedSettings";
import { I18nWrapper } from "../../test/i18n-wrapper";

function makeForm() {
	return {
		Field: vi.fn(
			({
				children,
			}: {
				children: (field: {
					state: { value: unknown; meta: { errors: unknown[] } };
					handleBlur: () => void;
					handleChange: (v: unknown) => void;
				}) => React.ReactNode;
			}) =>
				children({
					state: { value: "", meta: { errors: [] } },
					handleBlur: vi.fn(),
					handleChange: vi.fn(),
				}),
		),
		state: { values: { groupName: "" } },
		handleSubmit: vi.fn(),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

describe("AdvancedSettings", () => {
	it("renders toggle button with collapsed state", () => {
		const form = makeForm();
		render(
			<I18nWrapper>
				<AdvancedSettings form={form} visible={false} onToggle={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.getByText("Advanced Settings (SSH Keys, Proxy...)")).toBeInTheDocument();
	});

	it("does not show group field when not visible", () => {
		const form = makeForm();
		render(
			<I18nWrapper>
				<AdvancedSettings form={form} visible={false} onToggle={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.queryByText("Group")).not.toBeInTheDocument();
	});

	it("shows group field when visible", () => {
		const form = makeForm();
		render(
			<I18nWrapper>
				<AdvancedSettings form={form} visible={true} onToggle={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.getByText("Group")).toBeInTheDocument();
	});

	it("calls onToggle when toggle button is clicked", async () => {
		const user = userEvent.setup();
		const onToggle = vi.fn();
		const form = makeForm();
		render(
			<I18nWrapper>
				<AdvancedSettings form={form} visible={false} onToggle={onToggle} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button"));
		expect(onToggle).toHaveBeenCalledOnce();
	});

	it("renders input with correct placeholder", () => {
		const form = makeForm();
		render(
			<I18nWrapper>
				<AdvancedSettings form={form} visible={true} onToggle={vi.fn()} />
			</I18nWrapper>,
		);
		const input = screen.getByPlaceholderText("e.g. Work Servers");
		expect(input).toBeInTheDocument();
	});
});
