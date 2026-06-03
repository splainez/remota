import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import type { Connection } from "@shared/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { Sidebar } from "./Sidebar";

const emptyS3Fields = {
	accessKey: "",
	secretKey: "",
	region: "us-east-1",
	bucket: "",
	endpoint: "",
	useHttps: true,
	groupName: "",
};

const connections: Connection[] = [
	{
		id: 1,
		name: "Server A",
		protocol: "sftp",
		host: "a.example.com",
		port: 22,
		username: "u1",
		authType: "password",
		password: "",
		privateKeyPath: "",
		...emptyS3Fields,
		createdAt: "",
		updatedAt: "",
	},
	{
		id: 2,
		name: "Server B",
		protocol: "scp",
		host: "b.example.com",
		port: 22,
		username: "u2",
		authType: "key",
		password: "",
		privateKeyPath: "",
		...emptyS3Fields,
		createdAt: "",
		updatedAt: "",
	},
	{
		id: 3,
		name: "Server C",
		protocol: "s3",
		host: "c.example.com",
		port: 443,
		username: "u3",
		authType: "agent",
		password: "",
		privateKeyPath: "",
		...emptyS3Fields,
		createdAt: "",
		updatedAt: "",
	},
];

describe("Sidebar", () => {
	let onSelect: ReturnType<typeof vi.fn<(id: number) => void>>;
	let onAdd: ReturnType<typeof vi.fn<() => void>>;

	beforeEach(() => {
		onSelect = vi.fn();
		onAdd = vi.fn();
	});

	it("renders the header", () => {
		render(
			<I18nWrapper>
				<Sidebar connections={[]} selectedId={null} onSelect={onSelect} onAdd={onAdd} />
			</I18nWrapper>,
		);
		expect(screen.getByText("Connections")).toBeInTheDocument();
	});

	it("shows empty state when no connections", () => {
		render(
			<I18nWrapper>
				<Sidebar connections={[]} selectedId={null} onSelect={onSelect} onAdd={onAdd} />
			</I18nWrapper>,
		);
		expect(screen.getByText("Select a connection or create a new one.")).toBeInTheDocument();
	});

	it("renders all connections", () => {
		render(
			<I18nWrapper>
				<Sidebar connections={connections} selectedId={null} onSelect={onSelect} onAdd={onAdd} />
			</I18nWrapper>,
		);
		expect(screen.getByText("Server A")).toBeInTheDocument();
		expect(screen.getByText("Server B")).toBeInTheDocument();
		expect(screen.getByText("Server C")).toBeInTheDocument();
	});

	it("highlights the selected connection", () => {
		render(
			<I18nWrapper>
				<Sidebar connections={connections} selectedId={2} onSelect={onSelect} onAdd={onAdd} />
			</I18nWrapper>,
		);
		const allItems = screen.getAllByText(/Server [ABC]/);
		expect(allItems).toHaveLength(3);
	});

	it("calls onSelect when clicking a connection", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<Sidebar connections={connections} selectedId={null} onSelect={onSelect} onAdd={onAdd} />
			</I18nWrapper>,
		);
		await user.click(screen.getByText("Server A"));
		expect(onSelect).toHaveBeenCalledWith(1);
	});

	it("calls onAdd when clicking the add button", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<Sidebar connections={connections} selectedId={null} onSelect={onSelect} onAdd={onAdd} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: "+ Add Connection" }));
		expect(onAdd).toHaveBeenCalledOnce();
	});

	it("does not show empty state when connections exist", () => {
		render(
			<I18nWrapper>
				<Sidebar connections={connections} selectedId={null} onSelect={onSelect} onAdd={onAdd} />
			</I18nWrapper>,
		);
		expect(screen.queryByText("Select a connection or create a new one.")).not.toBeInTheDocument();
	});
});
