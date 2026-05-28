import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ConnectionErrorView } from "./ConnectionErrorView";

describe("ConnectionErrorView", () => {
	it("renders the connection lost message and technical detail", () => {
		render(<ConnectionErrorView technicalDetail="ECONNREFUSED 127.0.0.1:22" />);
		expect(screen.getByText("ECONNREFUSED 127.0.0.1:22")).toBeInTheDocument();
	});

	it("shows reconnect button when onReconnect is provided", () => {
		render(<ConnectionErrorView technicalDetail="Error" onReconnect={vi.fn()} />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("does not show reconnect button when onReconnect is not provided", () => {
		render(<ConnectionErrorView technicalDetail="Error" />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("calls onReconnect when reconnect button is clicked", async () => {
		const user = userEvent.setup();
		const onReconnect = vi.fn();
		render(<ConnectionErrorView technicalDetail="Error" onReconnect={onReconnect} />);
		await user.click(screen.getByRole("button"));
		expect(onReconnect).toHaveBeenCalledOnce();
	});
});
