import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "./Toolbar";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { canGoUp } from "@renderer/lib/utils";

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
		filter: "",
		onFilterChange: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	const cDriveRoot = ["C:", ""].join("\\");
	const dDriveRoot = ["D:", ""].join("\\");

	it("renders Up, Refresh and New Folder buttons", () => {
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} />
			</I18nWrapper>,
		);
		expect(screen.getByTitle("Parent Directory")).toBeInTheDocument();
		expect(screen.getByTitle("Refresh")).toBeInTheDocument();
		expect(screen.getByTitle("New Folder")).toBeInTheDocument();
	});

	it("enables Up button when not at root", () => {
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} currentPath="C:\\Users\\Sergio" />
			</I18nWrapper>,
		);
		expect(screen.getByTitle("Parent Directory")).not.toBeDisabled();
	});

	it("disables Up button at Unix root", () => {
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} currentPath="/" />
			</I18nWrapper>,
		);
		expect(screen.getByTitle("Parent Directory")).toBeDisabled();
	});

	it("disables Up button at Windows drive root via isAtDriveRoot", () => {
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} currentPath={cDriveRoot} isAtDriveRoot={true} />
			</I18nWrapper>,
		);
		expect(screen.getByTitle("Parent Directory")).toBeDisabled();
	});

	it("disables Up button at Windows drive root via canGoUp", () => {
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} currentPath={cDriveRoot} isAtDriveRoot={false} />
			</I18nWrapper>,
		);
		expect(screen.getByTitle("Parent Directory")).toBeDisabled();
	});

	it("calls onNavigateUp when Up is clicked", async () => {
		const onNavigateUp = vi.fn();
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} onNavigateUp={onNavigateUp} />
			</I18nWrapper>,
		);
		await userEvent.click(screen.getByTitle("Parent Directory"));
		expect(onNavigateUp).toHaveBeenCalledOnce();
	});

	it("calls onRefresh when Refresh is clicked", async () => {
		const onRefresh = vi.fn();
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} onRefresh={onRefresh} />
			</I18nWrapper>,
		);
		await userEvent.click(screen.getByTitle("Refresh"));
		expect(onRefresh).toHaveBeenCalledOnce();
	});

	it("shows drive selector when drives list is non-empty", () => {
		const drives = ["C:\\", "D:\\"];
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} drives={drives} />
			</I18nWrapper>,
		);
		expect(screen.getByTitle("Select drive")).toBeInTheDocument();
	});

	it("hides drive selector when drives list is empty", () => {
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} drives={[]} />
			</I18nWrapper>,
		);
		expect(screen.queryByTitle("Select drive")).not.toBeInTheDocument();
	});

	it("renders all drives as options", () => {
		const drives = ["C:\\", "D:\\", "E:\\"];
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} drives={drives} />
			</I18nWrapper>,
		);
		expect(screen.getByText("C:\\")).toBeInTheDocument();
		expect(screen.getByText("D:\\")).toBeInTheDocument();
		expect(screen.getByText("E:\\")).toBeInTheDocument();
	});

	it("calls onNavigateTo when a new drive is selected", async () => {
		const onNavigateTo = vi.fn();
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} drives={[dDriveRoot]} onNavigateTo={onNavigateTo} currentPath="C:\\Users" />
			</I18nWrapper>,
		);
		const select = screen.getByTitle("Select drive");
		await userEvent.selectOptions(select, dDriveRoot);
		expect(onNavigateTo).toHaveBeenCalledWith(dDriveRoot);
	});

	it("shows current drive as selected when at drive root", () => {
		const drives = [cDriveRoot, dDriveRoot];
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} drives={drives} currentPath={cDriveRoot} isAtDriveRoot={true} />
			</I18nWrapper>,
		);
		const select = screen.getByTitle<HTMLSelectElement>("Select drive");
		expect(select.value).toBe(cDriveRoot);
	});

	it("renders filter input with controlled value", () => {
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} filter="test" />
			</I18nWrapper>,
		);
		expect(screen.getByPlaceholderText("Filter...")).toHaveValue("test");
	});

	it("calls onFilterChange when filter input changes", async () => {
		const onFilterChange = vi.fn();
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} onFilterChange={onFilterChange} />
			</I18nWrapper>,
		);
		await userEvent.type(screen.getByPlaceholderText("Filter..."), "a");
		expect(onFilterChange).toHaveBeenCalledWith("a");
	});

	it("hides clear button when filter is empty", () => {
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} filter="" />
			</I18nWrapper>,
		);
		expect(screen.queryByTitle("Clear filter")).not.toBeInTheDocument();
	});

	it("shows clear button when filter is non-empty", () => {
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} filter="test" />
			</I18nWrapper>,
		);
		expect(screen.getByTitle("Clear filter")).toBeInTheDocument();
	});

	it("calls onFilterChange with empty string when clear button is clicked", async () => {
		const onFilterChange = vi.fn();
		render(
			<I18nWrapper>
				<Toolbar {...defaultProps} filter="test" onFilterChange={onFilterChange} />
			</I18nWrapper>,
		);
		await userEvent.click(screen.getByTitle("Clear filter"));
		expect(onFilterChange).toHaveBeenCalledWith("");
	});
});
