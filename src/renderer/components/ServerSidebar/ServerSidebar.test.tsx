import { ThemeProvider } from "@renderer/components/theme-provider";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import type { Connection } from "@shared/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { ServerSidebar } from "./ServerSidebar";

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
	makeConn({ id: 1, name: "Production Server", groupName: "Work" }),
	makeConn({ id: 2, name: "Dev Sandbox", groupName: "Work" }),
	makeConn({ id: 3, name: "Backups", groupName: "Personal" }),
	makeConn({ id: 4, name: "Misc" }),
];

describe("ServerSidebar", () => {
	it("renders active connection name when expanded", () => {
		render(
			<I18nWrapper>
				<ThemeProvider defaultTheme="dark">
					<ServerSidebar
						connections={connections}
						activeConnectionId={1}
						activeSessions={[{ connectionId: 1, connectedAt: Date.now() }]}
						onSelect={vi.fn()}
						onAdd={vi.fn()}
						onDoubleClick={vi.fn()}
						onViewAll={vi.fn()}
						onDisconnect={vi.fn()}
						onSettings={vi.fn()}
					/>
				</ThemeProvider>
			</I18nWrapper>,
		);

		expect(screen.getByText("Production Server")).toBeInTheDocument();
		expect(screen.queryByText("Dev Sandbox")).not.toBeInTheDocument();
	});

	it("shows empty message when no active connection", () => {
		render(
			<I18nWrapper>
				<ThemeProvider defaultTheme="dark">
					<ServerSidebar
						connections={connections}
						activeConnectionId={null}
						activeSessions={[]}
						onSelect={vi.fn()}
						onAdd={vi.fn()}
						onDoubleClick={vi.fn()}
						onViewAll={vi.fn()}
						onDisconnect={vi.fn()}
						onSettings={vi.fn()}
					/>
				</ThemeProvider>
			</I18nWrapper>,
		);

		expect(screen.getByText("No active connection")).toBeInTheDocument();
	});

	it("calls onSelect when active connection is clicked", async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(
			<I18nWrapper>
				<ThemeProvider defaultTheme="dark">
					<ServerSidebar
						connections={connections}
						activeConnectionId={1}
						activeSessions={[{ connectionId: 1, connectedAt: Date.now() }]}
						onSelect={onSelect}
						onAdd={vi.fn()}
						onDoubleClick={vi.fn()}
						onViewAll={vi.fn()}
						onDisconnect={vi.fn()}
						onSettings={vi.fn()}
					/>
				</ThemeProvider>
			</I18nWrapper>,
		);

		await user.click(screen.getByText("Production Server"));
		expect(onSelect).toHaveBeenCalledWith(1);
	});

	it("calls onAdd when add button is clicked", async () => {
		const user = userEvent.setup();
		const onAdd = vi.fn();
		render(
			<I18nWrapper>
				<ThemeProvider defaultTheme="dark">
					<ServerSidebar
						connections={connections}
						activeConnectionId={1}
						activeSessions={[{ connectionId: 1, connectedAt: Date.now() }]}
						onSelect={vi.fn()}
						onAdd={onAdd}
						onDoubleClick={vi.fn()}
						onViewAll={vi.fn()}
						onDisconnect={vi.fn()}
						onSettings={vi.fn()}
					/>
				</ThemeProvider>
			</I18nWrapper>,
		);

		await user.click(screen.getByRole("button", { name: "Add Connection" }));
		expect(onAdd).toHaveBeenCalledOnce();
	});

	it("collapses and expands sidebar", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<ThemeProvider defaultTheme="dark">
					<ServerSidebar
						connections={connections}
						activeConnectionId={1}
						activeSessions={[{ connectionId: 1, connectedAt: Date.now() }]}
						onSelect={vi.fn()}
						onAdd={vi.fn()}
						onDoubleClick={vi.fn()}
						onViewAll={vi.fn()}
						onDisconnect={vi.fn()}
						onSettings={vi.fn()}
					/>
				</ThemeProvider>
			</I18nWrapper>,
		);

		expect(screen.getByText("Production Server")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));

		expect(screen.queryByText("Production Server")).not.toBeInTheDocument();
		expect(screen.getByText("PS")).toBeInTheDocument();
	});

	it("shows theme dropdown and changes theme", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<ThemeProvider defaultTheme="dark">
					<ServerSidebar
						connections={connections}
						activeConnectionId={1}
						activeSessions={[{ connectionId: 1, connectedAt: Date.now() }]}
						onSelect={vi.fn()}
						onAdd={vi.fn()}
						onDoubleClick={vi.fn()}
						onViewAll={vi.fn()}
						onDisconnect={vi.fn()}
						onSettings={vi.fn()}
					/>
				</ThemeProvider>
			</I18nWrapper>,
		);

		await user.click(screen.getByRole("button", { name: "Change theme" }));
		expect(screen.getByText("Dark")).toBeInTheDocument();
		expect(screen.getByText("Light")).toBeInTheDocument();
		expect(screen.getByText("System")).toBeInTheDocument();
	});

	it("calls onViewAll when brand button is clicked", async () => {
		const user = userEvent.setup();
		const onViewAll = vi.fn();
		render(
			<I18nWrapper>
				<ThemeProvider defaultTheme="dark">
					<ServerSidebar
						connections={connections}
						activeConnectionId={1}
						activeSessions={[{ connectionId: 1, connectedAt: Date.now() }]}
						onSelect={vi.fn()}
						onAdd={vi.fn()}
						onDoubleClick={vi.fn()}
						onViewAll={onViewAll}
						onDisconnect={vi.fn()}
						onSettings={vi.fn()}
					/>
				</ThemeProvider>
			</I18nWrapper>,
		);

		await user.click(screen.getByTitle("OpenSCP"));
		expect(onViewAll).toHaveBeenCalledOnce();
	});

	it("calls onViewAll when header area is clicked", async () => {
		const user = userEvent.setup();
		const onViewAll = vi.fn();
		render(
			<I18nWrapper>
				<ThemeProvider defaultTheme="dark">
					<ServerSidebar
						connections={connections}
						activeConnectionId={1}
						activeSessions={[{ connectionId: 1, connectedAt: Date.now() }]}
						onSelect={vi.fn()}
						onAdd={vi.fn()}
						onDoubleClick={vi.fn()}
						onViewAll={onViewAll}
						onDisconnect={vi.fn()}
						onSettings={vi.fn()}
					/>
				</ThemeProvider>
			</I18nWrapper>,
		);

		await user.click(screen.getByText("OpenSCP"));
		expect(onViewAll).toHaveBeenCalledOnce();
	});

	it("calls onDisconnect when disconnect button is clicked", async () => {
		const user = userEvent.setup();
		const onDisconnect = vi.fn();
		render(
			<I18nWrapper>
				<ThemeProvider defaultTheme="dark">
					<ServerSidebar
						connections={connections}
						activeConnectionId={1}
						activeSessions={[{ connectionId: 1, connectedAt: Date.now() }]}
						onSelect={vi.fn()}
						onAdd={vi.fn()}
						onDoubleClick={vi.fn()}
						onViewAll={vi.fn()}
						onDisconnect={onDisconnect}
						onSettings={vi.fn()}
					/>
				</ThemeProvider>
			</I18nWrapper>,
		);

		await user.click(screen.getByTitle("Disconnect"));
		expect(onDisconnect).toHaveBeenCalledWith(1);
	});
});
