import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConnectionContextMenu } from "./ConnectionContextMenu";

vi.mock("../../store/appNavigation", () => ({
	useAppNavigation: vi.fn(() => ({
		openConnectionForm: vi.fn(),
	})),
}));

let mockOpenConnectionForm: ReturnType<typeof vi.fn>;

describe("ConnectionContextMenu", () => {
	beforeEach(async () => {
		mockOpenConnectionForm = vi.fn();
		const { useAppNavigation } = await import("../../store/appNavigation");
		vi.mocked(useAppNavigation).mockReturnValue({
			openConnectionForm: mockOpenConnectionForm,
		});
	});

	it("renders edit, connect and delete options", () => {
		render(
			<ConnectionContextMenu
				x={100}
				y={200}
				connectionId={1}
				onClose={vi.fn()}
				onConnect={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		expect(screen.getByText("Edit Connection")).toBeInTheDocument();
		expect(screen.getByText("Connect")).toBeInTheDocument();
		expect(screen.getByText("Delete")).toBeInTheDocument();
	});

	it("opens connection form for editing and closes on edit click", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(
			<ConnectionContextMenu
				x={100}
				y={200}
				connectionId={42}
				onClose={onClose}
				onConnect={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		await user.click(screen.getByText("Edit Connection"));
		expect(mockOpenConnectionForm).toHaveBeenCalledWith("edit", 42);
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("calls onConnect and closes on connect click", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const onConnect = vi.fn();
		render(
			<ConnectionContextMenu
				x={100}
				y={200}
				connectionId={7}
				onClose={onClose}
				onConnect={onConnect}
				onDelete={vi.fn()}
			/>,
		);
		await user.click(screen.getByText("Connect"));
		expect(onConnect).toHaveBeenCalledWith(7);
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("calls onDelete and closes on delete click", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const onDelete = vi.fn();
		render(
			<ConnectionContextMenu
				x={100}
				y={200}
				connectionId={3}
				onClose={onClose}
				onConnect={vi.fn()}
				onDelete={onDelete}
			/>,
		);
		await user.click(screen.getByText("Delete"));
		expect(onDelete).toHaveBeenCalledWith(3);
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("positions menu at given coordinates", () => {
		const { container } = render(
			<ConnectionContextMenu
				x={150}
				y={250}
				connectionId={1}
				onClose={vi.fn()}
				onConnect={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		const menu = container.firstElementChild as HTMLElement;
		expect(menu.style.left).toBe("150px");
		expect(menu.style.top).toBe("250px");
	});

	it("stops propagation on click", async () => {
		const user = userEvent.setup();
		const outerClick = vi.fn();
		render(
			<div onClick={outerClick}>
				<ConnectionContextMenu
					x={100}
					y={200}
					connectionId={1}
					onClose={vi.fn()}
					onConnect={vi.fn()}
					onDelete={vi.fn()}
				/>
			</div>,
		);
		await user.click(screen.getByText("Connect"));
		expect(outerClick).not.toHaveBeenCalled();
	});
});
