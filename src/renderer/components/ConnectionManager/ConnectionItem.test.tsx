import type { Connection } from "@shared/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { ConnectionItem } from "./ConnectionItem";

function makeConnection(overrides: Partial<Connection> = {}): Connection {
	return {
		id: 1,
		name: "Test Server",
		protocol: "sftp",
		host: "example.com",
		port: 22,
		username: "user",
		authType: "password",
		password: "",
		privateKeyPath: "",
		accessKey: "",
		secretKey: "",
		region: "us-east-1",
		bucket: "",
		endpoint: "",
		useHttps: true,
		groupName: "",
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
		...overrides,
	};
}

describe("ConnectionItem", () => {
	it("renders connection name", () => {
		const conn = makeConnection();
		render(
			<ConnectionItem
				connection={conn}
				isSelected={false}
				isActive={false}
				onClick={vi.fn()}
				onDoubleClick={vi.fn()}
				onContextMenu={vi.fn()}
			/>,
		);
		expect(screen.getByText("Test Server")).toBeInTheDocument();
	});

	it("renders connection details (user@host:port)", () => {
		const conn = makeConnection();
		render(
			<ConnectionItem
				connection={conn}
				isSelected={false}
				isActive={false}
				onClick={vi.fn()}
				onDoubleClick={vi.fn()}
				onContextMenu={vi.fn()}
			/>,
		);
		expect(screen.getByText("user@example.com:22")).toBeInTheDocument();
	});

	it("applies selected styling when isSelected is true", () => {
		const conn = makeConnection();
		const { container } = render(
			<ConnectionItem
				connection={conn}
				isSelected={true}
				isActive={false}
				onClick={vi.fn()}
				onDoubleClick={vi.fn()}
				onContextMenu={vi.fn()}
			/>,
		);
		expect(container.firstElementChild?.className).toContain("bg-primary/10");
	});

	it("shows active indicator when isActive is true", () => {
		const conn = makeConnection();
		const { container } = render(
			<ConnectionItem
				connection={conn}
				isSelected={false}
				isActive={true}
				onClick={vi.fn()}
				onDoubleClick={vi.fn()}
				onContextMenu={vi.fn()}
			/>,
		);
		expect(container.querySelector(".bg-primary")).not.toBeNull();
	});

	it("calls onClick on click", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		const conn = makeConnection();
		render(
			<ConnectionItem
				connection={conn}
				isSelected={false}
				isActive={false}
				onClick={onClick}
				onDoubleClick={vi.fn()}
				onContextMenu={vi.fn()}
			/>,
		);
		await user.click(screen.getByRole("button"));
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("calls onDoubleClick on double click", async () => {
		const user = userEvent.setup();
		const onDoubleClick = vi.fn();
		const conn = makeConnection();
		render(
			<ConnectionItem
				connection={conn}
				isSelected={false}
				isActive={false}
				onClick={vi.fn()}
				onDoubleClick={onDoubleClick}
				onContextMenu={vi.fn()}
			/>,
		);
		await user.dblClick(screen.getByRole("button"));
		expect(onDoubleClick).toHaveBeenCalledOnce();
	});

	it("calls onContextMenu on right click", async () => {
		const user = userEvent.setup();
		const onContextMenu = vi.fn();
		const conn = makeConnection();
		render(
			<ConnectionItem
				connection={conn}
				isSelected={false}
				isActive={false}
				onClick={vi.fn()}
				onDoubleClick={vi.fn()}
				onContextMenu={onContextMenu}
			/>,
		);
		await user.pointer({ keys: "[MouseRight]", target: screen.getByRole("button") });
		expect(onContextMenu).toHaveBeenCalledOnce();
	});

	it("renders terminal icon for SFTP protocol", () => {
		const conn = makeConnection({ protocol: "sftp" });
		render(
			<ConnectionItem
				connection={conn}
				isSelected={false}
				isActive={false}
				onClick={vi.fn()}
				onDoubleClick={vi.fn()}
				onContextMenu={vi.fn()}
			/>,
		);
		expect(screen.getByRole("button").querySelector("svg")).not.toBeNull();
	});

	it("renders cloud icon for S3 protocol", () => {
		const conn = makeConnection({ protocol: "s3", host: "s3.amazonaws.com", port: 443 });
		render(
			<ConnectionItem
				connection={conn}
				isSelected={false}
				isActive={false}
				onClick={vi.fn()}
				onDoubleClick={vi.fn()}
				onContextMenu={vi.fn()}
			/>,
		);
		expect(screen.getByRole("button").querySelector("svg")).not.toBeNull();
	});

	it("renders send icon for SCP protocol", () => {
		const conn = makeConnection({ protocol: "scp" });
		render(
			<ConnectionItem
				connection={conn}
				isSelected={false}
				isActive={false}
				onClick={vi.fn()}
				onDoubleClick={vi.fn()}
				onContextMenu={vi.fn()}
			/>,
		);
		expect(screen.getByRole("button").querySelector("svg")).not.toBeNull();
	});
});
