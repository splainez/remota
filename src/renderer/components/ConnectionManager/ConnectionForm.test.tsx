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

  it("updates port when protocol changes", async () => {
    const user = userEvent.setup();
    render(
      <ConnectionForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />
    );

    const select = screen.getByLabelText("Protocol");
    await user.selectOptions(select, "s3");

    const portInput = screen.getByLabelText<HTMLInputElement>("Port");
    expect(portInput.value).toBe("443");
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

  it("calls onSave with form data on submit", async () => {
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

    await user.click(screen.getByRole("button", { name: "Save" }));

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

  it("shows validation error for empty name on submit", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <ConnectionForm initial={null} onSave={onSave} onCancel={vi.fn()} />
    );

    await user.type(screen.getByLabelText("Host"), "myhost.com");
    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password", { selector: "input[type='password']" }), "pass");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Name is required")).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "Save" }));

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
    await user.click(screen.getByRole("button", { name: "Save" }));

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
    await user.click(screen.getByRole("button", { name: "Save" }));

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
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Private key path is required")).toBeInTheDocument();
  });
});
