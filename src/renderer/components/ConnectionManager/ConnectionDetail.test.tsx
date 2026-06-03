import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ConnectionDetail } from "./ConnectionDetail";
import type { Connection } from "@shared/types";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";

const sampleConnection: Connection = {
	id: 1,
	name: "My Server",
	protocol: "sftp",
	host: "example.com",
	port: 22,
	username: "admin",
	authType: "password",
	password: "secret",
	privateKeyPath: "",
	accessKey: "",
	secretKey: "",
	region: "us-east-1",
	bucket: "",
	endpoint: "",
	useHttps: true,
	groupName: "",
	createdAt: "",
	updatedAt: "",
};

describe("ConnectionDetail", () => {
	it("shows empty state when no connection is selected", () => {
		render(
			<I18nWrapper>
				<ConnectionDetail
					connection={null}
					isNew={false}
					isEditing={false}
					onEdit={vi.fn()}
					onCancel={vi.fn()}
					onConnect={vi.fn()}
					onSave={vi.fn()}
					onDelete={vi.fn()}
				/>
			</I18nWrapper>,
		);

		expect(screen.getByText("Select a connection or create a new one.")).toBeInTheDocument();
	});

	it("renders connection details in view mode", () => {
		render(
			<I18nWrapper>
				<ConnectionDetail
					connection={sampleConnection}
					isNew={false}
					isEditing={false}
					onEdit={vi.fn()}
					onCancel={vi.fn()}
					onConnect={vi.fn()}
					onSave={vi.fn()}
					onDelete={vi.fn()}
				/>
			</I18nWrapper>,
		);

		expect(screen.getByText("My Server")).toBeInTheDocument();
		expect(screen.getByText("sftp")).toBeInTheDocument();
		expect(screen.getByText("example.com")).toBeInTheDocument();
		expect(screen.getByText("22")).toBeInTheDocument();
		expect(screen.getByText("admin")).toBeInTheDocument();
	});

	it("renders form when isNew is true", () => {
		render(
			<I18nWrapper>
				<ConnectionDetail
					connection={null}
					isNew={true}
					isEditing={true}
					onEdit={vi.fn()}
					onCancel={vi.fn()}
					onConnect={vi.fn()}
					onSave={vi.fn()}
					onDelete={vi.fn()}
				/>
			</I18nWrapper>,
		);

		expect(screen.getAllByText("New Connection").length).toBeGreaterThan(0);
		expect(screen.getByLabelText("Host")).toBeInTheDocument();
	});

	it("renders form in edit mode", () => {
		render(
			<I18nWrapper>
				<ConnectionDetail
					connection={sampleConnection}
					isNew={false}
					isEditing={true}
					onEdit={vi.fn()}
					onCancel={vi.fn()}
					onConnect={vi.fn()}
					onSave={vi.fn()}
					onDelete={vi.fn()}
				/>
			</I18nWrapper>,
		);

		expect(screen.getAllByText("Edit Connection").length).toBeGreaterThan(0);
		expect(screen.getByDisplayValue("My Server")).toBeInTheDocument();
	});

	it("switches to edit mode on edit button click", async () => {
		const user = userEvent.setup();
		const onEdit = vi.fn();
		render(
			<I18nWrapper>
				<ConnectionDetail
					connection={sampleConnection}
					isNew={false}
					isEditing={false}
					onEdit={onEdit}
					onCancel={vi.fn()}
					onConnect={vi.fn()}
					onSave={vi.fn()}
					onDelete={vi.fn()}
				/>
			</I18nWrapper>,
		);

		await user.click(screen.getByRole("button", { name: "Edit Connection" }));
		expect(onEdit).toHaveBeenCalledOnce();
	});

	it("shows delete confirmation dialog then calls onDelete", async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();
		render(
			<I18nWrapper>
				<ConnectionDetail
					connection={sampleConnection}
					isNew={false}
					isEditing={false}
					onEdit={vi.fn()}
					onCancel={vi.fn()}
					onConnect={vi.fn()}
					onSave={vi.fn()}
					onDelete={onDelete}
				/>
			</I18nWrapper>,
		);

		await user.click(screen.getByRole("button", { name: "Delete" }));

		expect(screen.getByText("Are you sure you want to delete this connection?")).toBeInTheDocument();

		const confirmDelete = screen.getAllByRole("button", { name: "Delete" }).pop();
		expect(confirmDelete).toBeDefined();
		if (confirmDelete) await user.click(confirmDelete);

		expect(onDelete).toHaveBeenCalledWith(1);
	});

	it("calls onConnect when connect button is clicked", async () => {
		const user = userEvent.setup();
		const onConnect = vi.fn();
		render(
			<I18nWrapper>
				<ConnectionDetail
					connection={sampleConnection}
					isNew={false}
					isEditing={false}
					onEdit={vi.fn()}
					onCancel={vi.fn()}
					onConnect={onConnect}
					onSave={vi.fn()}
					onDelete={vi.fn()}
				/>
			</I18nWrapper>,
		);

		await user.click(screen.getByRole("button", { name: "Connect" }));
		expect(onConnect).toHaveBeenCalledOnce();
	});
});
