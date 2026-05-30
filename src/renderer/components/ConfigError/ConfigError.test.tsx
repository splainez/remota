import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfigError } from "./ConfigError";
import { createMockApi } from "../../test/setup";
import type { ElectronAPI } from "../../../shared/types";

function createMockApiWithError(overrides?: Partial<ElectronAPI>): ElectronAPI {
	return createMockApi({
		app: {
			getConfigPath: vi.fn<() => Promise<string>>().mockResolvedValue("/tmp/app-config.json"),
			getConfigError: vi.fn<() => Promise<{ message: string; filePath: string; issues: string[] } | null>>(),
			onConfigError: vi.fn().mockReturnValue(vi.fn()),
			...overrides?.app,
		},
	});
}

describe("ConfigError", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns null when no error", async () => {
		const api = createMockApi();
		vi.stubGlobal("api", api);

		const { container } = render(<ConfigError />);
		expect(container.innerHTML).toBe("");
	});

	it("renders error overlay with details", async () => {
		const api = createMockApiWithError();
		(api.app.getConfigError as ReturnType<typeof vi.fn>).mockResolvedValue({
			message: "Invalid configuration file",
			filePath: "/tmp/app-config.json",
			issues: ["connections: Expected array"],
		});
		vi.stubGlobal("api", api);

		render(<ConfigError />);

		expect(await screen.findByText("Configuration error")).toBeInTheDocument();
		expect(screen.getByText("/tmp/app-config.json")).toBeInTheDocument();
		expect(screen.getByText((c) => c.includes("connections: Expected array"))).toBeInTheDocument();
	});

	it("hides overlay on ignore", async () => {
		const api = createMockApiWithError();
		(api.app.getConfigError as ReturnType<typeof vi.fn>).mockResolvedValue({
			message: "Invalid configuration file",
			filePath: "/tmp/app-config.json",
			issues: [],
		});
		vi.stubGlobal("api", api);

		render(<ConfigError />);

		expect(await screen.findByText("Configuration error")).toBeInTheDocument();
		fireEvent.click(screen.getByText("Continue without configuration"));
		expect(screen.queryByText("Configuration error")).not.toBeInTheDocument();
	});
});
