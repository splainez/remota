import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import type { Connection } from "@shared/types";
import { fireEvent, render, screen } from "@testing-library/react";
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

function renderItem(props: Partial<React.ComponentProps<typeof ConnectionItem>> = {}) {
	const conn = props.connection ?? makeConnection();
	return render(
		<I18nWrapper>
			<ConnectionItem
				connection={conn}
				isSelected={false}
				isActive={false}
				onClick={vi.fn()}
				onDoubleClick={vi.fn()}
				onContextMenu={vi.fn()}
				{...props}
			/>
		</I18nWrapper>,
	);
}

describe("ConnectionItem", () => {
	it("renders connection name", () => {
		renderItem();
		expect(screen.getByText("Test Server")).toBeInTheDocument();
	});

	it("renders connection details (user@host:port)", () => {
		renderItem();
		expect(screen.getByText("user@example.com:22")).toBeInTheDocument();
	});

	it("applies selected styling when isSelected is true", () => {
		const { container } = renderItem({ isSelected: true });
		expect(container.firstElementChild?.className).toContain("bg-primary/10");
	});

	it("shows active indicator when isActive is true", () => {
		const { container } = renderItem({ isActive: true });
		expect(container.querySelector(".bg-primary")).not.toBeNull();
	});

	it("calls onClick on click", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		renderItem({ onClick });
		await user.click(screen.getByText("Test Server"));
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("calls onDoubleClick on double click", async () => {
		const user = userEvent.setup();
		const onDoubleClick = vi.fn();
		renderItem({ onDoubleClick });
		await user.dblClick(screen.getByText("Test Server"));
		expect(onDoubleClick).toHaveBeenCalledOnce();
	});

	it("calls onContextMenu on right click", async () => {
		const user = userEvent.setup();
		const onContextMenu = vi.fn();
		renderItem({ onContextMenu });
		await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Test Server") });
		expect(onContextMenu).toHaveBeenCalledOnce();
	});

	it("renders terminal icon for SFTP protocol", () => {
		const conn = makeConnection({ protocol: "sftp" });
		const { container } = renderItem({ connection: conn });
		expect(container.firstElementChild?.querySelector("svg")).not.toBeNull();
	});

	it("renders cloud icon for S3 protocol", () => {
		const conn = makeConnection({ protocol: "s3", host: "s3.amazonaws.com", port: 443 });
		const { container } = renderItem({ connection: conn });
		expect(container.firstElementChild?.querySelector("svg")).not.toBeNull();
	});

	it("renders send icon for SCP protocol", () => {
		const conn = makeConnection({ protocol: "scp" });
		const { container } = renderItem({ connection: conn });
		expect(container.firstElementChild?.querySelector("svg")).not.toBeNull();
	});

	describe("quick action buttons", () => {
		it("renders Open and Terminal action buttons when handlers are provided", () => {
			renderItem({ onOpen: vi.fn(), onOpenTerminal: vi.fn() });
			expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Terminal" })).toBeInTheDocument();
		});

		it("does not render action buttons when handlers are omitted", () => {
			renderItem();
			expect(screen.queryByRole("button", { name: "Open" })).not.toBeInTheDocument();
			expect(screen.queryByRole("button", { name: "Terminal" })).not.toBeInTheDocument();
		});

		it("calls onOpen when Open button is clicked", async () => {
			const user = userEvent.setup();
			const onOpen = vi.fn();
			const onClick = vi.fn();
			renderItem({ onOpen, onClick });
			await user.click(screen.getByRole("button", { name: "Open" }));
			expect(onOpen).toHaveBeenCalledOnce();
			expect(onClick).not.toHaveBeenCalled();
		});

		it("calls onOpenTerminal when Terminal button is clicked", async () => {
			const user = userEvent.setup();
			const onOpenTerminal = vi.fn();
			const onClick = vi.fn();
			renderItem({ onOpenTerminal, onClick });
			await user.click(screen.getByRole("button", { name: "Terminal" }));
			expect(onOpenTerminal).toHaveBeenCalledOnce();
			expect(onClick).not.toHaveBeenCalled();
		});

		it("disables Terminal button for S3 protocol", () => {
			const conn = makeConnection({ protocol: "s3", host: "s3.amazonaws.com", port: 443 });
			renderItem({ connection: conn, onOpenTerminal: vi.fn() });
			const terminalBtn = screen.getByRole("button", { name: "Terminals are not supported for S3 connections" });
			expect(terminalBtn).toBeDisabled();
		});

		it("enables Terminal button for non-S3 protocols", () => {
			const conn = makeConnection({ protocol: "sftp" });
			renderItem({ connection: conn, onOpenTerminal: vi.fn() });
			const terminalBtn = screen.getByRole("button", { name: "Terminal" });
			expect(terminalBtn).not.toBeDisabled();
		});

		it("does not call onOpenTerminal when disabled button is clicked", async () => {
			const user = userEvent.setup();
			const onOpenTerminal = vi.fn();
			const conn = makeConnection({ protocol: "s3", host: "s3.amazonaws.com", port: 443 });
			renderItem({ connection: conn, onOpenTerminal });
			const terminalBtn = screen.getByRole("button", { name: "Terminals are not supported for S3 connections" });
			await user.click(terminalBtn);
			expect(onOpenTerminal).not.toHaveBeenCalled();
		});

		it("supports keyboard activation on the row (Enter)", () => {
			const onClick = vi.fn();
			renderItem({ onClick });
			const row = screen.getByText("Test Server");
			fireEvent.keyDown(row, { key: "Enter" });
			expect(onClick).toHaveBeenCalledOnce();
		});

		it("does not trigger row onClick when Enter is pressed on the Open action button", () => {
			const onClick = vi.fn();
			const onOpen = vi.fn();
			renderItem({ onOpen, onClick });
			const openBtn = screen.getByRole("button", { name: "Open" });
			fireEvent.keyDown(openBtn, { key: "Enter" });
			expect(onClick).not.toHaveBeenCalled();
		});

		it("does not trigger row onClick when Enter is pressed on the Terminal action button", () => {
			const onClick = vi.fn();
			const onOpenTerminal = vi.fn();
			renderItem({ onOpenTerminal, onClick });
			const terminalBtn = screen.getByRole("button", { name: "Terminal" });
			fireEvent.keyDown(terminalBtn, { key: "Enter" });
			expect(onClick).not.toHaveBeenCalled();
		});
	});
});
