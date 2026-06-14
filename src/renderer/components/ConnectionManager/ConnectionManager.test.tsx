import { useConnectionsStore } from "@renderer/store/connections";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { createMockApi } from "@renderer/test/setup";
import type { Connection } from "@shared/types";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ConnectionManager } from "./ConnectionManager";

function mockConnections(overrides: Partial<Connection>[] = []) {
	return overrides.map((o, i) => ({
		id: i + 1,
		name: "Server",
		protocol: "sftp" as const,
		host: "example.com",
		port: 22,
		username: "user",
		authType: "password" as const,
		password: "",
		privateKeyPath: "",
		accessKey: "",
		secretKey: "",
		region: "us-east-1",
		bucket: "",
		endpoint: "",
		useHttps: true,
		createdAt: "",
		updatedAt: "",
		...o,
	}));
}

describe("ConnectionManager", () => {
	beforeEach(() => {
		useConnectionsStore.setState({ connections: [], selectedId: null, loaded: false });
		const mockApi = createMockApi();
		vi.stubGlobal("api", mockApi);
	});

	it("shows empty sidebar when no connections", async () => {
		render(
			<I18nWrapper>
				<ConnectionManager onConnect={vi.fn()} />
			</I18nWrapper>,
		);
		await waitFor(() => {
			expect(screen.getAllByText("Select a connection or create a new one.")).toHaveLength(2);
		});
	});

	it("loads and displays connections", async () => {
		const connections = mockConnections([
			{ id: 1, name: "Alpha", host: "alpha.com" },
			{ id: 2, name: "Beta", host: "beta.com" },
		]);
		const mockApi = createMockApi({
			connections: {
				list: vi.fn().mockResolvedValue(connections),
				get: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
				getRecent: vi.fn().mockResolvedValue([]),
				markRecent: vi.fn(),
				importSshConfig: vi.fn().mockResolvedValue({ imported: 0, errors: [] }),
				exportSshConfig: vi.fn().mockResolvedValue({ exported: 0, errors: [] }),
			},
		});
		vi.stubGlobal("api", mockApi);

		render(
			<I18nWrapper>
				<ConnectionManager onConnect={vi.fn()} />
			</I18nWrapper>,
		);

		await waitFor(() => {
			expect(screen.getByText("Alpha")).toBeInTheDocument();
			expect(screen.getByText("Beta")).toBeInTheDocument();
		});
	});

	it("selects a connection on click", async () => {
		const user = userEvent.setup();
		const connections = mockConnections([
			{ id: 1, name: "Alpha", host: "alpha.com" },
			{ id: 2, name: "Beta", host: "beta.com" },
		]);
		const mockApi = createMockApi({
			connections: {
				list: vi.fn().mockResolvedValue(connections),
				get: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
				getRecent: vi.fn().mockResolvedValue([]),
				markRecent: vi.fn(),
				importSshConfig: vi.fn().mockResolvedValue({ imported: 0, errors: [] }),
				exportSshConfig: vi.fn().mockResolvedValue({ exported: 0, errors: [] }),
			},
		});
		vi.stubGlobal("api", mockApi);

		render(
			<I18nWrapper>
				<ConnectionManager onConnect={vi.fn()} />
			</I18nWrapper>,
		);

		await waitFor(() => screen.getByText("Beta"));
		await user.click(screen.getByText("Beta"));

		expect(screen.getAllByText("Beta").length).toBeGreaterThanOrEqual(2);
	});

	it("opens new connection form on add", async () => {
		const user = userEvent.setup();
		const connections = mockConnections([{ id: 1, name: "Existing", host: "x.com" }]);
		const mockApi = createMockApi({
			connections: {
				list: vi.fn().mockResolvedValue(connections),
				get: vi.fn(),
				create: vi.fn().mockResolvedValue({
					id: 2,
					name: "New One",
					protocol: "sftp",
					host: "new.com",
					port: 22,
					username: "",
					authType: "password",
					password: "",
					privateKeyPath: "",
					accessKey: "",
					secretKey: "",
					region: "us-east-1",
					bucket: "",
					endpoint: "",
					useHttps: true,
					createdAt: "",
					updatedAt: "",
				}),
				update: vi.fn(),
				delete: vi.fn(),
				getRecent: vi.fn().mockResolvedValue([]),
				markRecent: vi.fn(),
				importSshConfig: vi.fn().mockResolvedValue({ imported: 0, errors: [] }),
				exportSshConfig: vi.fn().mockResolvedValue({ exported: 0, errors: [] }),
			},
		});
		vi.stubGlobal("api", mockApi);

		render(
			<I18nWrapper>
				<ConnectionManager onConnect={vi.fn()} />
			</I18nWrapper>,
		);

		await waitFor(() => screen.getByText("Existing"));
		await user.click(screen.getByRole("button", { name: "+ Add Connection" }));

		expect(screen.getAllByText("New Connection").length).toBeGreaterThan(0);
		expect(screen.getByLabelText("Host")).toBeInTheDocument();
	});
});
