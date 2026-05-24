import { describe, it, expect, beforeEach } from "vitest";
import { useNavigationStore } from "./navigation";

function getStore() {
	return useNavigationStore.getState();
}

describe("useNavigationStore", () => {
	beforeEach(() => {
		getStore().clear("local");
		getStore().clear("remote");
	});

	describe("canGoBack / canGoForward", () => {
		it("returns false for empty pane", () => {
			expect(getStore().canGoBack("local")).toBe(false);
			expect(getStore().canGoForward("local")).toBe(false);
		});

		it("returns false after single push", () => {
			getStore().push("local", "/home");
			expect(getStore().canGoBack("local")).toBe(false);
			expect(getStore().canGoForward("local")).toBe(false);
		});

		it("canGoBack returns true after two pushes", () => {
			getStore().push("local", "/home");
			getStore().push("local", "/home/user");
			expect(getStore().canGoBack("local")).toBe(true);
			expect(getStore().canGoForward("local")).toBe(false);
		});

		it("canGoForward returns true after going back", () => {
			getStore().push("local", "/home");
			getStore().push("local", "/home/user");
			getStore().push("local", "/home/user/docs");
			getStore().goBack("local");
			expect(getStore().canGoBack("local")).toBe(true);
			expect(getStore().canGoForward("local")).toBe(true);
		});
	});

	describe("goBack", () => {
		it("returns null when history is empty", () => {
			expect(getStore().goBack("local")).toBeNull();
		});

		it("returns null when at first entry", () => {
			getStore().push("local", "/home");
			expect(getStore().goBack("local")).toBeNull();
		});

		it("returns previous path and decrements index", () => {
			getStore().push("local", "/home");
			getStore().push("local", "/home/user");
			const result = getStore().goBack("local");
			expect(result).toBe("/home");
			expect(getStore().canGoBack("local")).toBe(false);
			expect(getStore().canGoForward("local")).toBe(true);
		});

		it("can go back multiple times", () => {
			getStore().push("local", "/home");
			getStore().push("local", "/home/user");
			getStore().push("local", "/home/user/docs");
			expect(getStore().goBack("local")).toBe("/home/user");
			expect(getStore().goBack("local")).toBe("/home");
			expect(getStore().goBack("local")).toBeNull();
		});
	});

	describe("goForward", () => {
		it("returns null when history is empty", () => {
			expect(getStore().goForward("local")).toBeNull();
		});

		it("returns null when at latest entry", () => {
			getStore().push("local", "/home");
			getStore().push("local", "/home/user");
			expect(getStore().goForward("local")).toBeNull();
		});

		it("returns forward path after going back", () => {
			getStore().push("local", "/home");
			getStore().push("local", "/home/user");
			getStore().goBack("local");
			expect(getStore().goForward("local")).toBe("/home/user");
			expect(getStore().canGoForward("local")).toBe(false);
		});

		it("can go forward multiple times", () => {
			getStore().push("local", "/a");
			getStore().push("local", "/b");
			getStore().push("local", "/c");
			getStore().goBack("local");
			getStore().goBack("local");
			expect(getStore().goForward("local")).toBe("/b");
			expect(getStore().goForward("local")).toBe("/c");
			expect(getStore().goForward("local")).toBeNull();
		});
	});

	describe("push (truncates forward entries)", () => {
		it("discards forward entries when navigating from middle of history", () => {
			getStore().push("local", "/a");
			getStore().push("local", "/b");
			getStore().push("local", "/c");
			getStore().goBack("local");
			getStore().goBack("local");
			expect(getStore().goForward("local")).toBe("/b");
			getStore().push("local", "/x");
			expect(getStore().goForward("local")).toBeNull();
			expect(getStore().panes.local.entries).toEqual(["/a", "/b", "/x"]);
		});
	});

	describe("clear", () => {
		it("resets history", () => {
			getStore().push("local", "/a");
			getStore().push("local", "/b");
			getStore().clear("local");
			expect(getStore().canGoBack("local")).toBe(false);
			expect(getStore().canGoForward("local")).toBe(false);
			expect(getStore().goBack("local")).toBeNull();
			expect(getStore().goForward("local")).toBeNull();
		});
	});

	describe("independent panes", () => {
		it("local and remote histories are independent", () => {
			getStore().push("local", "/local/a");
			getStore().push("local", "/local/b");
			getStore().push("remote", "/remote/x");
			getStore().push("remote", "/remote/y");
			getStore().goBack("local");
			expect(getStore().panes.local.index).toBe(0);
			expect(getStore().panes.remote.index).toBe(1);
		});
	});
});
