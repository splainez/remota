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

    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select.value).toBe("sftp");
  });

  it("updates port when protocol changes", async () => {
    const user = userEvent.setup();
    render(
      <ConnectionForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />
    );

    const select = screen.getByLabelText("Protocol");
    await user.selectOptions(select, "s3");

    const portInput = screen.getByLabelText("Port") as HTMLInputElement;
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

    await user.type(screen.getByLabelText("Host"), "newhost.com");
    await user.type(screen.getByLabelText("Username"), "newuser");

    const passwordInput = screen.getByLabelText("Password", { selector: "input[type='password']" });
    await user.type(passwordInput, "newpass");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "newhost.com",
        username: "newuser",
        password: "newpass",
        protocol: "sftp",
        port: 22,
      })
    );
  });

  it("uses host as name when name is empty", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <ConnectionForm initial={null} onSave={onSave} onCancel={vi.fn()} />
    );

    await user.type(screen.getByLabelText("Host"), "myhost.com");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: "myhost.com" })
    );
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
    await user.click(keyRadio!);

    expect(screen.getByLabelText("Key File Path")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Password", { selector: "input[type='password']" })
    ).not.toBeInTheDocument();
  });
});
