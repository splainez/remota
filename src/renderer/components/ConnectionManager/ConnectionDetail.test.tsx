import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ConnectionDetail } from "./ConnectionDetail";
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

describe("ConnectionDetail", () => {
  it("shows empty state when no connection is selected", () => {
    render(
      <ConnectionDetail
        connection={null}
        isNew={false}
        isEditing={false}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
        onConnect={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Select a connection or create a new one.")).toBeInTheDocument();
  });

  it("renders connection details in view mode", () => {
    render(
      <ConnectionDetail
        connection={sampleConnection}
        isNew={false}
        isEditing={false}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
        onConnect={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("My Server")).toBeInTheDocument();
    expect(screen.getByText("SFTP")).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByText("22")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("renders form when isNew is true", () => {
    render(
      <ConnectionDetail
        connection={null}
        isNew={true}
        isEditing={true}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
        onConnect={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("New Connection")).toBeInTheDocument();
    expect(screen.getByLabelText("Host")).toBeInTheDocument();
  });

  it("renders form in edit mode", () => {
    render(
      <ConnectionDetail
        connection={sampleConnection}
        isNew={false}
        isEditing={true}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
        onConnect={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Edit Connection")).toBeInTheDocument();
    expect(screen.getByDisplayValue("My Server")).toBeInTheDocument();
  });

  it("switches to edit mode on edit button click", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <ConnectionDetail
        connection={sampleConnection}
        isNew={false}
        isEditing={false}
        onEdit={onEdit}
        onCancel={vi.fn()}
        onConnect={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Edit Connection" }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("shows delete confirmation then calls onDelete", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <ConnectionDetail
        connection={sampleConnection}
        isNew={false}
        isEditing={false}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
        onConnect={vi.fn()}
        onSave={vi.fn()}
        onDelete={onDelete}
      />
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));

    const deleteBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(deleteBtn);

    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
