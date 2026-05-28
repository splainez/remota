import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ConnectionForm } from "./ConnectionForm";
import type { Connection } from "../../../shared/types";

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
	groupName: "Work",
	createdAt: "",
	updatedAt: "",
};

describe("ConnectionForm", () => {
	it("renders all form fields for new connection", () => {
		render(
			<ConnectionForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />
		);

		expect(screen.getByLabelText("Name")).toBeInTheDocument();
		expect(screen.getByLabelText("Protocol")).toBeInTheDocument();
		expect(screen.getByLabelText("Host")).toBeInTheDocument();
		expect(screen.getByLabelText("Port")).toBeInTheDocument();
		expect(screen.getByLabelText("Username")).toBeInTheDocument();
		expect(screen.getByText("Authentication")).toBeInTheDocument();
	});

	it("pre-fills fields when editing a connection", () => {
		render(
			<ConnectionForm initial={sampleConnection} onSave={vi.fn()} onCancel={vi.fn()} />
		);

		expect(screen.getByDisplayValue("My Server")).toBeInTheDocument();
		expect(screen.getByDisplayValue("example.com")).toBeInTheDocument();
		expect(screen.getByDisplayValue("22")).toBeInTheDocument();
		expect(screen.getByDisplayValue("admin")).toBeInTheDocument();
		expect(screen.getByDisplayValue("secret")).toBeInTheDocument();
	});

	it("defaults protocol to sftp", () => {
		const { container } = render(
			<ConnectionForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />
		);

		const select = container.querySelector("select");
		expect(select?.value).toBe("sftp");
	});

	it("updates port when protocol changes to s3", async () => {
		const user = userEvent.setup();
		render(
			<ConnectionForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />
		);

		const select = screen.getByLabelText("Protocol");
		await user.selectOptions(select, "s3");

		expect(screen.getByLabelText("Access Key")).toBeInTheDocument();
		expect(screen.queryByLabelText("Port")).not.toBeInTheDocument();
	});

	it("shows S3 fields when protocol is s3", async () => {
		const user = userEvent.setup();
		render(
			<ConnectionForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />
		);

		const select = screen.getByLabelText("Protocol");
		await user.selectOptions(select, "s3");

		expect(screen.getByLabelText("Access Key")).toBeInTheDocument();
		expect(screen.getByLabelText("Secret Key")).toBeInTheDocument();
		expect(screen.getByLabelText("Region")).toBeInTheDocument();
		expect(screen.getByLabelText("Bucket")).toBeInTheDocument();
		expect(screen.getByLabelText("Endpoint URL")).toBeInTheDocument();
		expect(screen.getByLabelText("Use HTTPS")).toBeInTheDocument();
	});

	it("hides SSH fields when protocol is s3", async () => {
		const user = userEvent.setup();
		render(
			<ConnectionForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />
		);

		const select = screen.getByLabelText("Protocol");
		await user.selectOptions(select, "s3");

		expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
		expect(screen.queryByText("Authentication")).not.toBeInTheDocument();
		expect(screen.getByLabelText("Access Key")).toBeInTheDocument();
	});

	it("shows SSH fields again when switching back from s3", async () => {
		const user = userEvent.setup();
		render(
			<ConnectionForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />
		);

		const select = screen.getByLabelText("Protocol");
		await user.selectOptions(select, "s3");
		await user.selectOptions(select, "sftp");

		expect(screen.getByLabelText("Host")).toBeInTheDocument();
		expect(screen.getByLabelText("Username")).toBeInTheDocument();
	});

	it("calls onCancel when cancel button is clicked", async () => {
		const user = userEvent.setup();
		const onCancel = vi.fn();
		render(
			<ConnectionForm initial={null} onSave={vi.fn()} onCancel={onCancel} />
		);

		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it("calls onSave with form data on Save Connection button click", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		render(
			<ConnectionForm initial={null} onSave={onSave} onCancel={vi.fn()} />
		);

		await user.type(screen.getByLabelText("Name"), "My Server");
		await user.type(screen.getByLabelText("Host"), "newhost.com");
		await user.type(screen.getByLabelText("Username"), "newuser");

		const passwordInput = screen.getByLabelText("Password", { selector: "input[type='password']" });
		await user.type(passwordInput, "newpass");

		await user.click(screen.getByRole("button", { name: "Save Connection" }));

		expect(onSave).toHaveBeenCalledOnce();
		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "My Server",
				host: "newhost.com",
				username: "newuser",
				password: "newpass",
				protocol: "sftp",
				port: 22,
			})
		);
	});

	it("calls onSave and onConnect with the saved Connection on Connect button click", async () => {
		const user = userEvent.setup();
		const savedConnection: Connection = {
			id: 42,
			name: "My Server",
			protocol: "sftp",
			host: "newhost.com",
			port: 22,
			username: "newuser",
			authType: "password",
			password: "newpass",
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
		};
		const onSave = vi.fn().mockResolvedValue(savedConnection);
		const onConnect = vi.fn();
		render(
			<ConnectionForm initial={null} onSave={onSave} onCancel={vi.fn()} onConnect={onConnect} />
		);

		await user.type(screen.getByLabelText("Name"), "My Server");
		await user.type(screen.getByLabelText("Host"), "newhost.com");
		await user.type(screen.getByLabelText("Username"), "newuser");

		const passwordInput = screen.getByLabelText("Password", { selector: "input[type='password']" });
		await user.type(passwordInput, "newpass");

		await user.click(screen.getByRole("button", { name: "Connect" }));

		expect(onSave).toHaveBeenCalledOnce();
		expect(onConnect).toHaveBeenCalledOnce();
		expect(onConnect).toHaveBeenCalledWith(savedConnection);
	});

	it("does not call onConnect when Connect is clicked but validation fails", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		const onConnect = vi.fn();
		render(
			<ConnectionForm initial={null} onSave={onSave} onCancel={vi.fn()} onConnect={onConnect} />
		);

		await user.type(screen.getByLabelText("Host"), "newhost.com");
		await user.type(screen.getByLabelText("Username"), "newuser");
		await user.type(screen.getByLabelText("Password", { selector: "input[type='password']" }), "pass");

		await user.click(screen.getByRole("button", { name: "Connect" }));

		expect(onSave).not.toHaveBeenCalled();
		expect(onConnect).not.toHaveBeenCalled();
	});

	it("calls onSave with S3 fields on submit", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		render(
			<ConnectionForm initial={null} onSave={onSave} onCancel={vi.fn()} />
		);

		const select = screen.getByLabelText("Protocol");
		await user.selectOptions(select, "s3");

		await user.type(screen.getByLabelText("Name"), "My S3 Bucket");
		await user.type(screen.getByLabelText("Access Key"), "AKIATEST");
		await user.type(screen.getByLabelText("Secret Key"), "secret123");
		const regionInput = screen.getByLabelText("Region");
		await user.clear(regionInput);
		await user.type(regionInput, "eu-west-1");
		await user.type(screen.getByLabelText("Bucket"), "my-bucket");

		await user.click(screen.getByRole("button", { name: "Save Connection" }));

		expect(onSave).toHaveBeenCalledOnce();
		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "My S3 Bucket",
				protocol: "s3",
				accessKey: "AKIATEST",
				secretKey: "secret123",
				region: "eu-west-1",
				bucket: "my-bucket",
				useHttps: true,
			})
		);
	});

	it("defaults useHttps to checked for S3", async () => {
		const user = userEvent.setup();
		render(
			<ConnectionForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />
		);

		const select = screen.getByLabelText("Protocol");
		await user.selectOptions(select, "s3");

		const useHttps = screen.getByLabelText<HTMLInputElement>("Use HTTPS");
		expect(useHttps.checked).toBe(true);
	});

	it("shows validation error for empty name on submit", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		render(
			<ConnectionForm initial={null} onSave={onSave} onCancel={vi.fn()} />
		);

		await user.type(screen.getByLabelText("Host"), "myhost.com");
		await user.type(screen.getByLabelText("Username"), "admin");
		await user.type(screen.getByLabelText("Password", { selector: "input[type='password']" }), "pass");
		await user.click(screen.getByRole("button", { name: "Save Connection" }));

		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByText("Name is required")).toBeInTheDocument();
	});

	it("shows validation error for missing S3 fields on submit", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		render(
			<ConnectionForm initial={null} onSave={onSave} onCancel={vi.fn()} />
		);

		const select = screen.getByLabelText("Protocol");
		await user.selectOptions(select, "s3");

		await user.type(screen.getByLabelText("Name"), "My S3");
		await user.click(screen.getByRole("button", { name: "Save Connection" }));

		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByText("Access key is required")).toBeInTheDocument();
	});

	it("shows password field for password auth", () => {
		render(
			<ConnectionForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />
		);
		expect(screen.getByLabelText("Password", { selector: "input[type='password']" })).toBeInTheDocument();
	});

	it("shows private key field when auth type is key", async () => {
		const user = userEvent.setup();
		const { container } = render(
			<ConnectionForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />
		);

		const keyRadio = container.querySelector<HTMLInputElement>('input[value="key"]');
		expect(keyRadio).not.toBeNull();
		if (keyRadio) await user.click(keyRadio);

		expect(screen.getByLabelText("Key File Path")).toBeInTheDocument();
		expect(
			screen.queryByLabelText("Password", { selector: "input[type='password']" })
		).not.toBeInTheDocument();
	});

	it("shows validation error for empty host on submit", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		render(
			<ConnectionForm initial={null} onSave={onSave} onCancel={vi.fn()} />
		);

		await user.type(screen.getByLabelText("Name"), "Test");
		await user.type(screen.getByLabelText("Username"), "admin");
		await user.click(screen.getByRole("button", { name: "Save Connection" }));

		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByText("Host is required")).toBeInTheDocument();
	});

	it("shows validation error for empty username on submit", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		render(
			<ConnectionForm initial={null} onSave={onSave} onCancel={vi.fn()} />
		);

		await user.type(screen.getByLabelText("Name"), "Test");
		await user.type(screen.getByLabelText("Host"), "example.com");
		await user.click(screen.getByRole("button", { name: "Save Connection" }));

		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByText("Username is required")).toBeInTheDocument();
	});

	it("shows validation error for empty password on blur", async () => {
		const user = userEvent.setup();
		render(
			<ConnectionForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />
		);

		const passwordInput = screen.getByLabelText("Password", { selector: "input[type='password']" });
		await user.clear(passwordInput);
		await user.tab();

		expect(screen.getByText("Password is required")).toBeInTheDocument();
	});

	it("shows validation error for empty private key path on blur", async () => {
		const user = userEvent.setup();
		const { container } = render(
			<ConnectionForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />
		);

		const keyRadio = container.querySelector<HTMLInputElement>('input[value="key"]');
		if (keyRadio) await user.click(keyRadio);

		const keyInput = screen.getByLabelText("Key File Path");
		await user.clear(keyInput);
		await user.tab();

		expect(screen.getByText("Private key path is required")).toBeInTheDocument();
	});

	it("shows validation error for missing password on submit", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		render(
			<ConnectionForm initial={null} onSave={onSave} onCancel={vi.fn()} />
		);

		await user.type(screen.getByLabelText("Name"), "Test");
		await user.type(screen.getByLabelText("Host"), "example.com");
		await user.type(screen.getByLabelText("Username"), "admin");
		await user.clear(screen.getByLabelText("Password", { selector: "input[type='password']" }));
		await user.click(screen.getByRole("button", { name: "Save Connection" }));

		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByText("Password is required")).toBeInTheDocument();
	});

	it("shows validation error for missing private key path on submit", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		const { container } = render(
			<ConnectionForm initial={null} onSave={onSave} onCancel={vi.fn()} />
		);

		const keyRadio = container.querySelector<HTMLInputElement>('input[value="key"]');
		if (keyRadio) await user.click(keyRadio);

		await user.type(screen.getByLabelText("Name"), "Test");
		await user.type(screen.getByLabelText("Host"), "example.com");
		await user.type(screen.getByLabelText("Username"), "admin");
		await user.click(screen.getByRole("button", { name: "Save Connection" }));

		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByText("Private key path is required")).toBeInTheDocument();
	});

	it("shows group field in advanced settings", async () => {
		const user = userEvent.setup();
		render(
			<ConnectionForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />
		);

		expect(screen.queryByLabelText("Group")).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /Advanced Settings/i }));

		expect(screen.getByLabelText("Group")).toBeInTheDocument();
	});
});
