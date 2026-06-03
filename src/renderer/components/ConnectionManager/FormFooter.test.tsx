import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { FormFooter } from "./FormFooter";

describe("FormFooter", () => {
	it("renders cancel, save, and connect buttons", () => {
		render(
			<I18nWrapper>
				<FormFooter onCancel={vi.fn()} onSave={vi.fn()} onConnect={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Save Connection" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
	});

	it("calls onCancel when cancel is clicked", async () => {
		const user = userEvent.setup();
		const onCancel = vi.fn();
		render(
			<I18nWrapper>
				<FormFooter onCancel={onCancel} onSave={vi.fn()} onConnect={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it("calls onSave when save is clicked", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		render(
			<I18nWrapper>
				<FormFooter onCancel={vi.fn()} onSave={onSave} onConnect={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: "Save Connection" }));
		expect(onSave).toHaveBeenCalledOnce();
	});

	it("calls onConnect when connect is clicked", async () => {
		const user = userEvent.setup();
		const onConnect = vi.fn();
		render(
			<I18nWrapper>
				<FormFooter onCancel={vi.fn()} onSave={vi.fn()} onConnect={onConnect} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: "Connect" }));
		expect(onConnect).toHaveBeenCalledOnce();
	});
});
