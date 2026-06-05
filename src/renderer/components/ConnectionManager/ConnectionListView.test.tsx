import { ThemeProvider } from "@renderer/components/theme-provider";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import type { Connection } from "@shared/types";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { ConnectionListView } from "./ConnectionListView";

function makeConn(overrides: Partial<Connection> = {}): Connection {
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
		createdAt: "",
		updatedAt: "",
		...overrides,
	};
}

const connections: Connection[] = [
	makeConn({ id: 1, name: "Production Server", host: "prod.example.com", groupName: "Work" }),
	makeConn({ id: 2, name: "Dev Sandbox", host: "dev.example.com", groupName: "Work" }),
	makeConn({ id: 3, name: "Backups", host: "backup.example.com", groupName: "Personal" }),
	makeConn({ id: 4, name: "Misc Server", host: "misc.example.com" }),
];

const defaultProps = {
	connections,
	selectedId: null as number | null,
	activeConnectionId: null as number | null,
	onSelect: vi.fn(),
	onAdd: vi.fn(),
	onDoubleClick: vi.fn(),
	onOpen: vi.fn(),
	onOpenTerminal: vi.fn(),
	onDelete: vi.fn(),
};

function renderList(props = defaultProps) {
	return render(
		<I18nWrapper>
			<ThemeProvider defaultTheme="dark">
				<ConnectionListView {...props} />
			</ThemeProvider>
		</I18nWrapper>,
	);
}

describe("ConnectionListView", () => {
	it("renders the connections header", () => {
		renderList();
		expect(screen.getByText("Connections")).toBeInTheDocument();
	});

	it("renders all connections", () => {
		renderList();
		expect(screen.getByText("Production Server")).toBeInTheDocument();
		expect(screen.getByText("Dev Sandbox")).toBeInTheDocument();
		expect(screen.getByText("Backups")).toBeInTheDocument();
		expect(screen.getByText("Misc Server")).toBeInTheDocument();
	});

	it("renders group headers", () => {
		renderList();
		expect(screen.getByText("Work")).toBeInTheDocument();
		expect(screen.getByText("Personal")).toBeInTheDocument();
		expect(screen.getByText("Uncategorized")).toBeInTheDocument();
	});

	it("filters connections by search", async () => {
		const user = userEvent.setup();
		renderList();

		const input = screen.getByPlaceholderText("Filter...");
		await user.type(input, "Production");

		expect(screen.getByText("Production Server")).toBeInTheDocument();
		expect(screen.queryByText("Dev Sandbox")).not.toBeInTheDocument();
		expect(screen.queryByText("Backups")).not.toBeInTheDocument();
	});

	it("calls onSelect when a connection is clicked", async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		renderList({ ...defaultProps, onSelect });

		await user.click(screen.getByText("Production Server"));
		expect(onSelect).toHaveBeenCalledWith(1);
	});

	it("calls onDoubleClick when a connection is double-clicked", async () => {
		const user = userEvent.setup();
		const onDoubleClick = vi.fn();
		renderList({ ...defaultProps, onDoubleClick });

		await user.dblClick(screen.getByText("Production Server"));
		expect(onDoubleClick).toHaveBeenCalledWith(1);
	});

	it("calls onAdd when add button is clicked", async () => {
		const user = userEvent.setup();
		const onAdd = vi.fn();
		renderList({ ...defaultProps, onAdd });

		await user.click(screen.getByRole("button", { name: /Add Connection/i }));
		expect(onAdd).toHaveBeenCalledOnce();
	});

	it("shows active connection indicator", () => {
		renderList({ ...defaultProps, activeConnectionId: 1 });
		const activeIndicators = screen
			.getAllByText("")
			.filter((el) => el.classList.contains("bg-primary") && el.classList.contains("w-2"));
		expect(activeIndicators.length).toBeGreaterThanOrEqual(1);
	});

	it("shows empty state when no connections", () => {
		renderList({ ...defaultProps, connections: [] });
		expect(screen.getByText("Select a connection or create a new one.")).toBeInTheDocument();
	});

	it("toggles group collapse", async () => {
		const user = userEvent.setup();
		renderList();

		expect(screen.getByText("Production Server")).toBeInTheDocument();

		const workHeader = screen.getByText("Work");
		await user.click(workHeader);

		expect(screen.queryByText("Production Server")).not.toBeInTheDocument();
	});

	it("shows context menu on right click", () => {
		renderList();

		const conn = screen.getByText("Production Server");
		fireEvent.contextMenu(conn);

		expect(screen.getByText("Edit Connection")).toBeInTheDocument();
		expect(screen.getByText("Connect")).toBeInTheDocument();
		expect(screen.getByText("Delete")).toBeInTheDocument();
	});

	it("calls onDelete from context menu", async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();
		renderList({ ...defaultProps, onDelete });

		const conn = screen.getByText("Production Server");
		fireEvent.contextMenu(conn);

		await user.click(screen.getByText("Delete"));
		expect(onDelete).toHaveBeenCalledWith(1);
	});

	describe("quick action buttons", () => {
		it("renders Open and Terminal buttons for each connection", () => {
			renderList();
			expect(screen.getAllByRole("button", { name: "Open" })).toHaveLength(connections.length);
			expect(screen.getAllByRole("button", { name: "Terminal" })).toHaveLength(connections.length);
		});

		it("calls onOpen with the connection id when Open is clicked", async () => {
			const user = userEvent.setup();
			const onOpen = vi.fn();
			renderList({ ...defaultProps, onOpen });

			const openButtons = screen.getAllByRole("button", { name: "Open" });
			await user.click(openButtons[0]);

			expect(onOpen).toHaveBeenCalledWith(1);
		});

		it("calls onOpenTerminal with the connection id when Terminal is clicked", async () => {
			const user = userEvent.setup();
			const onOpenTerminal = vi.fn();
			renderList({ ...defaultProps, onOpenTerminal });

			const terminalButtons = screen.getAllByRole("button", { name: "Terminal" });
			await user.click(terminalButtons[2]);

			expect(onOpenTerminal).toHaveBeenCalledWith(3);
		});
	});
});
