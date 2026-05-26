import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "./Toolbar";
import { canGoUp } from "../../lib/utils";

describe("canGoUp", () => {
	it("returns false for /", () => {
		expect(canGoUp("/")).toBe(false);
	});

	it("returns false for Windows drive root", () => {
		expect(canGoUp("C:\\")).toBe(false);
		expect(canGoUp("D:\\")).toBe(false);
	});

	it("returns true for normal directory paths", () => {
		expect(canGoUp("C:\\Users")).toBe(true);
		expect(canGoUp("/home/user")).toBe(true);
	});
});

describe("Toolbar", () => {
	const defaultProps = {
		onGoBack: vi.fn(),
		onGoForward: vi.fn(),
		canGoBack: false,
		canGoForward: false,
		onNavigateUp: vi.fn(),
		onRefresh: vi.fn(),
		onNavigateTo: vi.fn(),
		drives: [] as string[],
		currentPath: "C:\\Users",
		isAtDriveRoot: false,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	const cDriveRoot = ["C:", ""].join("\\");
	const dDriveRoot = ["D:", ""].join("\\");

	it("renders Back, Forward, Up and Refresh buttons", () => {
		render(<Toolbar {...defaultProps} />);
		expect(screen.getByTitle("Back")).toBeInTheDocument();
		expect(screen.getByTitle("Forward")).toBeInTheDocument();
		expect(screen.getByTitle("Parent Directory")).toBeInTheDocument();
		expect(screen.getByTitle("Refresh")).toBeInTheDocument();
	});

	it("disables Back button when canGoBack is false", () => {
		render(<Toolbar {...defaultProps} canGoBack={false} />);
		expect(screen.getByTitle("Back")).toBeDisabled();
	});

	it("enables Back button when canGoBack is true", () => {
		render(<Toolbar {...defaultProps} canGoBack={true} />);
		expect(screen.getByTitle("Back")).not.toBeDisabled();
	});

	it("disables Forward button when canGoForward is false", () => {
		render(<Toolbar {...defaultProps} canGoForward={false} />);
		expect(screen.getByTitle("Forward")).toBeDisabled();
	});

	it("enables Forward button when canGoForward is true", () => {
		render(<Toolbar {...defaultProps} canGoForward={true} />);
		expect(screen.getByTitle("Forward")).not.toBeDisabled();
	});

	it("calls onGoBack when Back is clicked", async () => {
		const onGoBack = vi.fn();
		render(<Toolbar {...defaultProps} onGoBack={onGoBack} canGoBack={true} />);
		await userEvent.click(screen.getByTitle("Back"));
		expect(onGoBack).toHaveBeenCalledOnce();
	});

	it("calls onGoForward when Forward is clicked", async () => {
		const onGoForward = vi.fn();
		render(<Toolbar {...defaultProps} onGoForward={onGoForward} canGoForward={true} />);
		await userEvent.click(screen.getByTitle("Forward"));
		expect(onGoForward).toHaveBeenCalledOnce();
	});

	it("does not call onGoBack when Back is disabled", async () => {
		const onGoBack = vi.fn();
		render(<Toolbar {...defaultProps} onGoBack={onGoBack} canGoBack={false} />);
		await userEvent.click(screen.getByTitle("Back"));
		expect(onGoBack).not.toHaveBeenCalled();
	});

	it("does not call onGoForward when Forward is disabled", async () => {
		const onGoForward = vi.fn();
		render(<Toolbar {...defaultProps} onGoForward={onGoForward} canGoForward={false} />);
		await userEvent.click(screen.getByTitle("Forward"));
		expect(onGoForward).not.toHaveBeenCalled();
	});

	it("enables Up button when not at root", () => {
		render(<Toolbar {...defaultProps} currentPath="C:\\Users\\Sergio" />);
		expect(screen.getByTitle("Parent Directory")).not.toBeDisabled();
	});

	it("disables Up button at Unix root", () => {
		render(<Toolbar {...defaultProps} currentPath="/" />);
		expect(screen.getByTitle("Parent Directory")).toBeDisabled();
	});

	it("disables Up button at Windows drive root via isAtDriveRoot", () => {
		render(
			<Toolbar
				{...defaultProps}
				currentPath={cDriveRoot}
				isAtDriveRoot={true}
			/>
		);
		expect(screen.getByTitle("Parent Directory")).toBeDisabled();
	});

	it("disables Up button at Windows drive root via canGoUp", () => {
		render(
			<Toolbar
				{...defaultProps}
				currentPath={cDriveRoot}
				isAtDriveRoot={false}
			/>
		);
		expect(screen.getByTitle("Parent Directory")).toBeDisabled();
	});

	it("calls onNavigateUp when Up is clicked", async () => {
		const onNavigateUp = vi.fn();
		render(<Toolbar {...defaultProps} onNavigateUp={onNavigateUp} />);
		await userEvent.click(screen.getByTitle("Parent Directory"));
		expect(onNavigateUp).toHaveBeenCalledOnce();
	});

	it("calls onRefresh when Refresh is clicked", async () => {
		const onRefresh = vi.fn();
		render(<Toolbar {...defaultProps} onRefresh={onRefresh} />);
		await userEvent.click(screen.getByTitle("Refresh"));
		expect(onRefresh).toHaveBeenCalledOnce();
	});

	it("shows drive selector when drives list is non-empty", () => {
		const drives = ["C:\\", "D:\\"];
		render(<Toolbar {...defaultProps} drives={drives} />);
		expect(screen.getByTitle("Select drive")).toBeInTheDocument();
	});

	it("hides drive selector when drives list is empty", () => {
		render(<Toolbar {...defaultProps} drives={[]} />);
		expect(screen.queryByTitle("Select drive")).not.toBeInTheDocument();
	});

	it("renders all drives as options", () => {
		const drives = ["C:\\", "D:\\", "E:\\"];
		render(<Toolbar {...defaultProps} drives={drives} />);
		expect(screen.getByText("C:\\")).toBeInTheDocument();
		expect(screen.getByText("D:\\")).toBeInTheDocument();
		expect(screen.getByText("E:\\")).toBeInTheDocument();
	});

	it("calls onNavigateTo when a new drive is selected", async () => {
		const onNavigateTo = vi.fn();
		render(
			<Toolbar
				{...defaultProps}
				drives={[dDriveRoot]}
				onNavigateTo={onNavigateTo}
				currentPath="C:\\Users"
			/>
		);
		const select = screen.getByTitle("Select drive");
		await userEvent.selectOptions(select, dDriveRoot);
		expect(onNavigateTo).toHaveBeenCalledWith(dDriveRoot);
	});

	it("shows current drive as selected when at drive root", () => {
		const drives = [cDriveRoot, dDriveRoot];
		render(
			<Toolbar
				{...defaultProps}
				drives={drives}
				currentPath={cDriveRoot}
				isAtDriveRoot={true}
			/>
		);
		const select = screen.getByTitle<HTMLSelectElement>("Select drive");
		expect(select.value).toBe(cDriveRoot);
	});
});
