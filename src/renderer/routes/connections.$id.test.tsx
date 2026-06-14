import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", async (importOriginal) => {
	const actual: Record<string, unknown> = await importOriginal();
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

vi.mock("@renderer/hooks/useConnections", () => ({
	useConnections: () => ({
		connections: [
			{
				id: 1,
				name: "Test Server",
				protocol: "sftp",
				host: "example.com",
				port: 22,
				username: "user",
				authType: "password",
			},
		],
		selected: null,
		loading: false,
		update: vi.fn(),
		remove: vi.fn(),
		select: vi.fn(),
	}),
}));

const mockAddSession = vi.fn();

vi.mock("@renderer/store/activeSessions", () => ({
	useActiveSessionsStore: Object.assign(
		vi.fn((selector?: (s: unknown) => unknown) => {
			const state = {
				sessions: [],
				addSession: mockAddSession,
				removeSession: vi.fn(),
				hasSession: vi.fn(() => false),
			};
			return selector ? selector(state) : state;
		}),
		{
			getState: () => ({
				sessions: [],
				addSession: mockAddSession,
				removeSession: vi.fn(),
				hasSession: vi.fn(() => false),
			}),
		},
	),
}));

describe("ConnectionDetailRoute handleConnect", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls addSession before navigating to file browser", async () => {
		const user = userEvent.setup();
		const { connectionDetailRoute } = await import("./connections.$id");

		vi.spyOn(connectionDetailRoute, "useParams").mockReturnValue({ id: "1" });

		const Component = connectionDetailRoute.options.component ?? (() => null);

		render(
			<I18nWrapper>
				<Component />
			</I18nWrapper>,
		);

		const connectButton = screen.getByRole("button", { name: "Connect" });
		await user.click(connectButton);

		expect(mockAddSession).toHaveBeenCalledWith(1);
		expect(mockNavigate).toHaveBeenCalledWith({
			to: "/browse/$connectionId",
			params: { connectionId: "1" },
		});
	});

	it("calls addSession exactly once per connect", async () => {
		const user = userEvent.setup();
		const { connectionDetailRoute } = await import("./connections.$id");

		vi.spyOn(connectionDetailRoute, "useParams").mockReturnValue({ id: "1" });

		const Component = connectionDetailRoute.options.component ?? (() => null);

		render(
			<I18nWrapper>
				<Component />
			</I18nWrapper>,
		);

		const connectButton = screen.getByRole("button", { name: "Connect" });
		await user.click(connectButton);

		expect(mockAddSession).toHaveBeenCalledTimes(1);
	});
});
