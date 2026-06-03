import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FileListHeader } from "./FileListHeader";
import { I18nWrapper } from "../../test/i18n-wrapper";

describe("FileListHeader", () => {
	it("renders name, size, and modified headers", () => {
		render(
			<I18nWrapper>
				<FileListHeader onSort={vi.fn()} sortKey="name" sortDir="asc" />
			</I18nWrapper>,
		);
		expect(screen.getByRole("button", { name: /name/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /size/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /modified/i })).toBeInTheDocument();
	});

	it("shows ascending indicator on active sort column", () => {
		render(
			<I18nWrapper>
				<FileListHeader onSort={vi.fn()} sortKey="name" sortDir="asc" />
			</I18nWrapper>,
		);
		expect(screen.getByTestId("sort-asc")).toBeInTheDocument();
		expect(screen.queryByTestId("sort-desc")).not.toBeInTheDocument();
	});

	it("shows descending indicator on active sort column", () => {
		render(
			<I18nWrapper>
				<FileListHeader onSort={vi.fn()} sortKey="name" sortDir="desc" />
			</I18nWrapper>,
		);
		expect(screen.getByTestId("sort-desc")).toBeInTheDocument();
		expect(screen.queryByTestId("sort-asc")).not.toBeInTheDocument();
	});

	it("shows no indicator on inactive columns", () => {
		render(
			<I18nWrapper>
				<FileListHeader onSort={vi.fn()} sortKey="name" sortDir="asc" />
			</I18nWrapper>,
		);
		const sizeBtn = screen.getByRole("button", { name: /size/i });
		expect(sizeBtn.querySelector("svg")).toBeNull();
	});

	it("calls onSort with 'name' when name header is clicked", async () => {
		const user = userEvent.setup();
		const onSort = vi.fn();
		render(
			<I18nWrapper>
				<FileListHeader onSort={onSort} sortKey="size" sortDir="asc" />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: /name/i }));
		expect(onSort).toHaveBeenCalledWith("name");
	});

	it("calls onSort with 'size' when size header is clicked", async () => {
		const user = userEvent.setup();
		const onSort = vi.fn();
		render(
			<I18nWrapper>
				<FileListHeader onSort={onSort} sortKey="name" sortDir="asc" />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: /size/i }));
		expect(onSort).toHaveBeenCalledWith("size");
	});

	it("calls onSort with 'modified' when modified header is clicked", async () => {
		const user = userEvent.setup();
		const onSort = vi.fn();
		render(
			<I18nWrapper>
				<FileListHeader onSort={onSort} sortKey="name" sortDir="asc" />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: /modified/i }));
		expect(onSort).toHaveBeenCalledWith("modified");
	});
});
