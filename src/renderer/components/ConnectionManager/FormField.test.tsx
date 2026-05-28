import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FormField } from "./FormField";

describe("FormField", () => {
	it("renders label text", () => {
		render(
			<FormField label="Hostname" htmlFor="host">
				<input id="host" />
			</FormField>,
		);
		expect(screen.getByText("Hostname")).toBeInTheDocument();
	});

	it("sets htmlFor on label", () => {
		render(
			<FormField label="Hostname" htmlFor="test-id">
				<input id="test-id" />
			</FormField>,
		);
		expect(screen.getByText("Hostname")).toHaveAttribute("for", "test-id");
	});

	it("shows required indicator when required is true", () => {
		render(
			<FormField label="Hostname" required htmlFor="host">
				<input id="host" />
			</FormField>,
		);
		const label = screen.getByText("Hostname");
		expect(label.className).toContain("after:content");
	});

	it("does not show required indicator when required is not set", () => {
		render(
			<FormField label="Hostname" htmlFor="host">
				<input id="host" />
			</FormField>,
		);
		const label = screen.getByText("Hostname");
		expect(label.className).not.toContain("after:content");
	});

	it("renders children", () => {
		render(
			<FormField label="Hostname" htmlFor="host">
				<input id="host" data-testid="child-input" />
			</FormField>,
		);
		expect(screen.getByTestId("child-input")).toBeInTheDocument();
	});

	it("renders error messages from string array", () => {
		render(
			<FormField label="Hostname" htmlFor="host" errors={["Required field", "Invalid format"]}>
				<input id="host" />
			</FormField>,
		);
		expect(screen.getByText("Required field")).toBeInTheDocument();
		expect(screen.getByText("Invalid format")).toBeInTheDocument();
	});

	it("renders error messages from object with message property", () => {
		render(
			<FormField
				label="Hostname"
				htmlFor="host"
				errors={[{ message: "Must not be empty" }]}
			>
				<input id="host" />
			</FormField>,
		);
		expect(screen.getByText("Must not be empty")).toBeInTheDocument();
	});

	it("renders default error for unknown error types", () => {
		render(
			<FormField label="Hostname" htmlFor="host" errors={[null]}>
				<input id="host" />
			</FormField>,
		);
		expect(screen.getByText("Invalid value")).toBeInTheDocument();
	});

	it("renders default error for empty object", () => {
		render(
			<FormField label="Hostname" htmlFor="host" errors={[{}]}>
				<input id="host" />
			</FormField>,
		);
		expect(screen.getByText("Invalid value")).toBeInTheDocument();
	});

	it("renders icon when provided", () => {
		render(
			<FormField label="Hostname" htmlFor="host" icon={<span data-testid="icon">*</span>}>
				<input id="host" />
			</FormField>,
		);
		expect(screen.getByTestId("icon")).toBeInTheDocument();
	});
});
