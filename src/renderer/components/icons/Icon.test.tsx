import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Icon } from "./Icon";

describe("Icon", () => {
	it("renders an icon by name", () => {
		render(<Icon name="folder" data-testid="icon" />);
		const el = screen.getByTestId("icon");
		expect(el).toBeInTheDocument();
	});

	it("renders each known icon name without error", () => {
		const names = [
			"account",
			"add",
			"arrow-down",
			"arrow-left",
			"arrow-right",
			"arrow-up",
			"beaker",
			"bell",
			"book",
			"bookmark",
			"bug",
			"calendar",
			"check",
			"close",
			"cloud",
			"copy",
			"database",
			"diff",
			"edit",
			"error",
			"extensions",
			"eye",
			"eye-closed",
			"file",
			"file-binary",
			"file-code",
			"file-media",
			"file-pdf",
			"file-submodule",
			"file-symlink",
			"file-zip",
			"files",
			"flame",
			"folder",
			"folder-active",
			"folder-library",
			"folder-opened",
			"gear",
			"git-commit",
			"git-merge",
			"git-pull-request",
			"github",
			"globe",
			"graph",
			"history",
			"home",
			"info",
			"json",
			"key",
			"layers",
			"layout",
			"link",
			"link-external",
			"list-flat",
			"list-tree",
			"lock",
			"mail",
			"markdown",
			"mic",
			"mute",
			"new-file",
			"new-folder",
			"note",
			"notebook",
			"package",
			"person",
			"play",
			"plug",
			"record",
			"refresh",
			"remote",
			"reply",
			"repo",
			"repo-forked",
			"rocket",
			"root-folder",
			"root-folder-opened",
			"save",
			"search",
			"send",
			"server",
			"settings",
			"settings-gear",
			"shield",
			"star-empty",
			"star-full",
			"symbol-class",
			"symbol-enum",
			"symbol-interface",
			"symbol-method",
			"symbol-misc",
			"symbol-namespace",
			"symbol-variable",
			"sync",
			"table",
			"tag",
			"terminal",
			"trash",
			"triangle-down",
			"triangle-up",
			"type-hierarchy",
			"unlock",
			"warning",
		] as const;

		for (const name of names) {
			const { unmount } = render(<Icon name={name} data-testid="icon" />);
			expect(screen.getByTestId("icon")).toBeInTheDocument();
			unmount();
		}
	});

	it("renders with custom size", () => {
		render(<Icon name="folder" size={32} data-testid="icon" />);
		const el = screen.getByTestId("icon");
		expect(el).toBeInTheDocument();
	});

	it("renders with custom className", () => {
		render(<Icon name="folder" className="my-custom" data-testid="icon" />);
		const el = screen.getByTestId("icon");
		expect(el.getAttribute("class")).toContain("my-custom");
	});
});
