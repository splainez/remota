import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { FilePermissionsDialog } from "./FilePermissionsDialog";

function createMockEntry(overrides: Record<string, unknown> = {}) {
	return {
		name: "test.txt",
		fullPath: "/home/user/test.txt",
		isDirectory: false,
		size: 1024,
		modified: "2024-01-01T00:00:00Z",
		mode: 0o644,
		uid: 1000,
		gid: 1000,
		ownerName: "testuser",
		groupName: "testgroup",
		...overrides,
	};
}

const defaultUsers = [
	{ name: "root", uid: 0 },
	{ name: "testuser", uid: 1000 },
];

const defaultGroups = [
	{ name: "root", gid: 0 },
	{ name: "testgroup", gid: 1000 },
];

describe("FilePermissionsDialog", () => {
	it("does not render when closed", () => {
		render(
			<FilePermissionsDialog
				open={false}
				entry={createMockEntry()}
				users={defaultUsers}
				groups={defaultGroups}
				loading={false}
				onClose={vi.fn()}
				onApply={vi.fn()}
			/>,
			{ wrapper: I18nWrapper },
		);
		expect(screen.queryByText("File Properties")).not.toBeInTheDocument();
	});

	it("renders file info when open", () => {
		render(
			<FilePermissionsDialog
				open={true}
				entry={createMockEntry()}
				users={defaultUsers}
				groups={defaultGroups}
				loading={false}
				onClose={vi.fn()}
				onApply={vi.fn()}
			/>,
			{ wrapper: I18nWrapper },
		);
		expect(screen.getByText("test.txt")).toBeInTheDocument();
		expect(screen.getByText("/home/user/test.txt")).toBeInTheDocument();
	});

	it("shows loading state for selects", () => {
		render(
			<FilePermissionsDialog
				open={true}
				entry={createMockEntry()}
				users={[]}
				groups={[]}
				loading={true}
				onClose={vi.fn()}
				onApply={vi.fn()}
			/>,
			{ wrapper: I18nWrapper },
		);
		expect(screen.getByText("File Properties")).toBeInTheDocument();
	});

	it("calls onClose when Cancel is clicked", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();

		render(
			<FilePermissionsDialog
				open={true}
				entry={createMockEntry()}
				users={defaultUsers}
				groups={defaultGroups}
				loading={false}
				onClose={onClose}
				onApply={vi.fn()}
			/>,
			{ wrapper: I18nWrapper },
		);

		await user.click(screen.getByText("Cancel"));
		expect(onClose).toHaveBeenCalled();
	});

	it("shows octal value matching mode 644", () => {
		render(
			<FilePermissionsDialog
				open={true}
				entry={createMockEntry({ mode: 0o644 })}
				users={defaultUsers}
				groups={defaultGroups}
				loading={false}
				onClose={vi.fn()}
				onApply={vi.fn()}
			/>,
			{ wrapper: I18nWrapper },
		);
		expect(screen.getByDisplayValue("0644")).toBeInTheDocument();
	});

	it("returns null if entry is null", () => {
		const { container } = render(
			<FilePermissionsDialog
				open={true}
				entry={null}
				users={defaultUsers}
				groups={defaultGroups}
				loading={false}
				onClose={vi.fn()}
				onApply={vi.fn()}
			/>,
			{ wrapper: I18nWrapper },
		);
		expect(container.innerHTML).toBe("");
	});
});
