import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRemoteConnection } from "./useRemoteConnection";

vi.mock("../../shared/sftp-error", () => ({
	classifyError: vi.fn((err: unknown) => ({
		code: "UNKNOWN" as const,
		technicalDetail: err instanceof Error ? err.message : String(err),
	})),
}));

describe("useRemoteConnection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("starts in connecting state", () => {
		const { result } = renderHook(() => useRemoteConnection(1));
		expect(result.current.remoteStatus).toBe("connecting");
		expect(result.current.remoteError).toBeNull();
		expect(result.current.remotePath).toBe("/");
	});

	it("sets connected state on successful connection", async () => {
		(window as unknown as { api: { filesystem: { remoteConnect: () => Promise<string> } } }).api = {
			filesystem: {
				remoteConnect: vi.fn().mockResolvedValue("/home/user"),
			},
		};

		const { result } = renderHook(() => useRemoteConnection(1));
		await act(async () => {
			await result.current.connect();
		});

		expect(result.current.remoteStatus).toBe("connected");
		expect(result.current.remotePath).toBe("/home/user");
		expect(result.current.remoteError).toBeNull();
	});

	it("sets error state on connection failure", async () => {
		(window as unknown as { api: { filesystem: { remoteConnect: () => Promise<never> } } }).api = {
			filesystem: {
				remoteConnect: vi.fn().mockRejectedValue(new Error("Connection refused")),
			},
		};

		const { result } = renderHook(() => useRemoteConnection(1));
		await act(async () => {
			await result.current.connect();
		});

		expect(result.current.remoteStatus).toBe("error");
		expect(result.current.remoteError).not.toBeNull();
		expect(result.current.remoteError?.code).toBe("UNKNOWN");
	});

	it("resets error state on reconnect attempt", async () => {
		(window as unknown as { api: { filesystem: { remoteConnect: () => Promise<string> } } }).api = {
			filesystem: {
				remoteConnect: vi.fn().mockRejectedValueOnce(new Error("Timeout")).mockResolvedValueOnce("/home/admin"),
			},
		};

		const { result } = renderHook(() => useRemoteConnection(1));

		await act(async () => {
			await result.current.connect();
		});
		expect(result.current.remoteStatus).toBe("error");

		await act(async () => {
			await result.current.connect();
		});
		expect(result.current.remoteStatus).toBe("connected");
		expect(result.current.remoteError).toBeNull();
	});

	it("increments reconnectKey on successful connection", async () => {
		(window as unknown as { api: { filesystem: { remoteConnect: () => Promise<string> } } }).api = {
			filesystem: {
				remoteConnect: vi.fn().mockResolvedValue("/"),
			},
		};

		const { result } = renderHook(() => useRemoteConnection(1));
		expect(result.current.reconnectKey).toBe(0);

		await act(async () => {
			await result.current.connect();
		});
		expect(result.current.reconnectKey).toBe(1);
	});

	it("allows setting remotePath manually", () => {
		const { result } = renderHook(() => useRemoteConnection(1));
		act(() => {
			result.current.setRemotePath("/var/www");
		});
		expect(result.current.remotePath).toBe("/var/www");
	});
});
