import { test, expect } from "@playwright/test";

test.describe("Connection Manager", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const connections: Array<{
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
      }> = [];

      let nextId = 1;

      (window as any).api = {
        connections: {
          list: () => Promise.resolve([...connections]),
          get: (id: number) => Promise.resolve(connections.find((c) => c.id === id) ?? null),
          create: (data: any) => {
            const conn = {
              id: nextId++,
              name: data.name,
              protocol: data.protocol,
              host: data.host,
              port: data.port,
              username: data.username,
              authType: data.authType,
              password: data.password,
              privateKeyPath: data.privateKeyPath,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            connections.push(conn);
            return Promise.resolve(conn);
          },
          update: (data: any) => {
            const idx = connections.findIndex((c) => c.id === data.id);
            if (idx >= 0) {
              Object.assign(connections[idx], data);
              return Promise.resolve(connections[idx]);
            }
            return Promise.resolve(null);
          },
          delete: (id: number) => {
            const idx = connections.findIndex((c) => c.id === id);
            if (idx >= 0) {
              connections.splice(idx, 1);
              return Promise.resolve(true);
            }
            return Promise.resolve(false);
          },
        },
      };
    });

    await page.goto("/");
  });

  test("shows empty state initially", async ({ page }) => {
    await expect(page.getByText("Select a connection or create a new one.")).toHaveCount(2);
    await expect(page.getByRole("button", { name: "+ Add Connection" })).toBeVisible();
  });

  test("adds a new connection and shows it in the sidebar", async ({ page }) => {
    await page.getByRole("button", { name: "+ Add Connection" }).click();

    await expect(page.getByText("New Connection")).toBeVisible();

    await page.getByLabel("Name").fill("Production Server");
    await page.getByLabel("Host").fill("prod.example.com");
    await page.getByLabel("Username").fill("deploy");

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Production Server")).toBeVisible();
    await expect(page.getByText("SFTP")).toBeVisible();
    await expect(page.getByText("prod.example.com")).toBeVisible();
    await expect(page.getByText("deploy")).toBeVisible();
  });

  test("adds multiple connections", async ({ page }) => {
    const servers = [
      { name: "Web Server", host: "web.internal" },
      { name: "DB Server", host: "db.internal" },
    ];

    for (const s of servers) {
      await page.getByRole("button", { name: "+ Add Connection" }).click();
      await page.getByLabel("Name").fill(s.name);
      await page.getByLabel("Host").fill(s.host);
      await page.getByRole("button", { name: "Save" }).click();
    }

    await expect(page.getByText("Web Server")).toBeVisible();
    await expect(page.getByText("DB Server")).toBeVisible();
  });

  test("selects a connection and shows details", async ({ page }) => {
    await page.getByRole("button", { name: "+ Add Connection" }).click();
    await page.getByLabel("Host").fill("test.com");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("test.com")).toBeVisible();
  });

  test("edits a connection", async ({ page }) => {
    await page.getByRole("button", { name: "+ Add Connection" }).click();
    await page.getByLabel("Name").fill("Original Name");
    await page.getByLabel("Host").fill("old.example.com");
    await page.getByRole("button", { name: "Save" }).click();

    await page.getByRole("button", { name: "Edit Connection" }).click();
    await page.getByLabel("Name").clear();
    await page.getByLabel("Name").fill("Renamed Server");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Renamed Server")).toBeVisible();
  });

  test("deletes a connection", async ({ page }) => {
    await page.getByRole("button", { name: "+ Add Connection" }).click();
    await page.getByLabel("Host").fill("temp.example.com");
    await page.getByRole("button", { name: "Save" }).click();

    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("temp.example.com")).not.toBeVisible();
    await expect(page.getByText("Select a connection or create a new one.")).toBeVisible();
  });
});
