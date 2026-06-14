import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useActiveSessionsStore } from "./activeSessions";

describe("useActiveSessionsStore", () => {
	beforeEach(() => {
		useActiveSessionsStore.setState({ sessions: [] });
		vi.clearAllMocks();
	});

	it("starts with empty sessions", () => {
		expect(useActiveSessionsStore.getState().sessions).toEqual([]);
	});

	it("addSession adds a session with connecting status by default", () => {
		act(() => {
			useActiveSessionsStore.getState().addSession(1);
		});

		const sessions = useActiveSessionsStore.getState().sessions;
		expect(sessions).toHaveLength(1);
		expect(sessions[0].connectionId).toBe(1);
		expect(sessions[0].status).toBe("connecting");
		expect(sessions[0].connectedAt).toBeTypeOf("number");
	});

	it("addSession with explicit connected status", () => {
		act(() => {
			useActiveSessionsStore.getState().addSession(1, "connected");
		});

		expect(useActiveSessionsStore.getState().sessions[0].status).toBe("connected");
	});

	it("addSession ignores duplicate connectionId", () => {
		act(() => {
			useActiveSessionsStore.getState().addSession(1);
		});
		act(() => {
			useActiveSessionsStore.getState().addSession(1, "connected");
		});

		expect(useActiveSessionsStore.getState().sessions).toHaveLength(1);
		expect(useActiveSessionsStore.getState().sessions[0].status).toBe("connecting");
	});

	it("updateSessionStatus changes status of existing session", () => {
		act(() => {
			useActiveSessionsStore.getState().addSession(1);
		});
		expect(useActiveSessionsStore.getState().sessions[0].status).toBe("connecting");

		act(() => {
			useActiveSessionsStore.getState().updateSessionStatus(1, "connected");
		});
		expect(useActiveSessionsStore.getState().sessions[0].status).toBe("connected");
	});

	it("updateSessionStatus is a no-op for unknown connectionId", () => {
		act(() => {
			useActiveSessionsStore.getState().addSession(1);
		});

		act(() => {
			useActiveSessionsStore.getState().updateSessionStatus(999, "connected");
		});

		expect(useActiveSessionsStore.getState().sessions).toHaveLength(1);
		expect(useActiveSessionsStore.getState().sessions[0].status).toBe("connecting");
	});

	it("removeSession removes session by connectionId", () => {
		act(() => {
			useActiveSessionsStore.getState().addSession(1);
		});
		act(() => {
			useActiveSessionsStore.getState().addSession(2);
		});

		act(() => {
			useActiveSessionsStore.getState().removeSession(1);
		});

		expect(useActiveSessionsStore.getState().sessions).toHaveLength(1);
		expect(useActiveSessionsStore.getState().sessions[0].connectionId).toBe(2);
	});

	it("removeSession is a no-op for unknown connectionId", () => {
		act(() => {
			useActiveSessionsStore.getState().addSession(1);
		});

		act(() => {
			useActiveSessionsStore.getState().removeSession(999);
		});

		expect(useActiveSessionsStore.getState().sessions).toHaveLength(1);
	});

	it("hasSession returns true for existing session", () => {
		act(() => {
			useActiveSessionsStore.getState().addSession(1);
		});

		expect(useActiveSessionsStore.getState().hasSession(1)).toBe(true);
	});

	it("hasSession returns false for unknown connectionId", () => {
		expect(useActiveSessionsStore.getState().hasSession(1)).toBe(false);
	});

	it("hasSession returns false after removal", () => {
		act(() => {
			useActiveSessionsStore.getState().addSession(1);
		});
		act(() => {
			useActiveSessionsStore.getState().removeSession(1);
		});

		expect(useActiveSessionsStore.getState().hasSession(1)).toBe(false);
	});

	it("multiple sessions with mixed statuses", () => {
		act(() => {
			useActiveSessionsStore.getState().addSession(1);
		});
		act(() => {
			useActiveSessionsStore.getState().addSession(2);
		});

		act(() => {
			useActiveSessionsStore.getState().updateSessionStatus(1, "connected");
		});

		const sessions = useActiveSessionsStore.getState().sessions;
		expect(sessions).toHaveLength(2);
		expect(sessions.find((s) => s.connectionId === 1)?.status).toBe("connected");
		expect(sessions.find((s) => s.connectionId === 2)?.status).toBe("connecting");
	});
});
