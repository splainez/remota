import { test, expect, type Page } from "@playwright/test";

interface MockConnection {
	id: number;
	name: string;
	protocol: string;
	host: string;
	port: number;
	username: string;
	authType: string;
	password: string;
	privateKeyPath: string;
	createdAt: string;
	updatedAt: string;
}

interface SeedData {
	connections: MockConnection[];
	nextId: number;
}

async function initMock(page: Page, seed?: SeedData) {
	await page.addInitScript((seedArg: SeedData | undefined) => {
		const conns = seedArg ? seedArg.connections.map((c: MockConnection) => ({ ...c })) : [];
		let nextId = seedArg ? seedArg.nextId : 1;

		const api = {
			connections: {
				list: () => Promise.resolve(conns.map((c: MockConnection) => ({ ...c }))),
				get: (id: number) => Promise.resolve(conns.find((c: MockConnection) => c.id === id) ?? null),
				create: (data: Record<string, unknown>) => {
					const conn: MockConnection = {
						id: nextId++,
						name: data.name as string,
						protocol: data.protocol as string,
						host: data.host as string,
						port: data.port as number,
						username: data.username as string,
						authType: data.authType as string,
						password: data.password as string,
						privateKeyPath: data.privateKeyPath as string,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					};
					conns.push(conn);
					return Promise.resolve(conn);
				},
				update: (data: Record<string, unknown>) => {
					const idx = conns.findIndex((c: MockConnection) => c.id === data.id);
					if (idx >= 0) {
						Object.assign(conns[idx], data);
						return Promise.resolve(conns[idx]);
					}
					return Promise.resolve(null);
				},
				delete: (id: number) => {
					const idx = conns.findIndex((c: MockConnection) => c.id === id);
					if (idx >= 0) {
						conns.splice(idx, 1);
						return Promise.resolve(true);
					}
					return Promise.resolve(false);
				},
			},
			filesystem: {
				list: () => Promise.resolve([]),
				listDrives: () => Promise.resolve([]),
				homeDir: () => Promise.resolve("/home/user"),
				pathExists: () => Promise.resolve(true),
				getLastPath: () => Promise.resolve(null),
				setLastPath: () => Promise.resolve(),
			},
			platform: "linux",
		};
		(window as unknown as Record<string, unknown>).api = api;
	}, seed);
	await page.goto("/");
}

const emptyConn: MockConnection = {
	id: 1,
	name: "Existing Server",
	protocol: "sftp",
	host: "existing.com",
	port: 22,
	username: "admin",
	authType: "password",
	password: "secret",
	privateKeyPath: "",
	createdAt: "2024-01-01T00:00:00Z",
	updatedAt: "2024-01-01T00:00:00Z",
};

test.describe("Connection Manager", () => {
	test.describe("empty state", () => {
		test.beforeEach(async ({ page }) => initMock(page));

		test("shows empty state initially", async ({ page }) => {
			await expect(page.getByText("Select a connection or create a new one.")).toHaveCount(2);
			await expect(page.getByRole("button", { name: "+ Add Connection" })).toBeVisible();
		});

		test("adds a new connection and shows it in the sidebar", async ({ page }) => {
			await page.getByRole("button", { name: "+ Add Connection" }).click();
			await expect(page.getByText("New Connection")).toBeVisible();

			await page.getByLabel("Host").fill("test.example.com");
			await page.getByRole("button", { name: "Save" }).click();

			await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible();
			await page.getByRole("button", { name: "Disconnect" }).click();

			await expect(page.getByText("test.example.com")).toBeVisible();
		});
	});

	test.describe("with connections", () => {
		const seed: SeedData = {
			connections: [emptyConn],
			nextId: 2,
		};

		test.beforeEach(async ({ page }) => initMock(page, seed));

		test("selects a connection and shows details", async ({ page }) => {
			await page.getByText("Existing Server").click();
			await expect(page.getByText("SFTP", { exact: true })).toBeVisible();
			await expect(page.getByText("existing.com", { exact: true })).toBeVisible();
		});

		test("edits a connection", async ({ page }) => {
			await page.getByText("Existing Server").click();
			await page.getByRole("button", { name: "Edit Connection" }).click();

			const nameInput = page.getByRole("textbox", { name: "Name", exact: true });
			await nameInput.clear();
			await nameInput.fill("Renamed Server");
			await page.getByRole("button", { name: "Save" }).click();

			await expect(page.getByText("Renamed Server", { exact: true })).toHaveCount(2);
		});

		test("deletes a connection", async ({ page }) => {
			await page.getByText("Existing Server").click();
			await page.getByRole("button", { name: "Delete" }).click();
			await page.getByRole("button", { name: "Delete" }).click();

			await expect(page.getByText("Existing Server", { exact: true })).not.toBeVisible();
			await expect(page.getByText("Select a connection or create a new one.")).toHaveCount(2);
		});
	});
});
