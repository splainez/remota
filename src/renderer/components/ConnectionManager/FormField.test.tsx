import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FormField } from "./FormField";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";

describe("FormField", () => {
	it("renders label text", () => {
		render(
			<I18nWrapper>
				<FormField label="Hostname" htmlFor="host">
					<input id="host" />
				</FormField>
			</I18nWrapper>,
		);
		expect(screen.getByText("Hostname")).toBeInTheDocument();
	});

	it("sets htmlFor on label", () => {
		render(
			<I18nWrapper>
				<FormField label="Hostname" htmlFor="test-id">
					<input id="test-id" />
				</FormField>
			</I18nWrapper>,
		);
		expect(screen.getByText("Hostname")).toHaveAttribute("for", "test-id");
	});

	it("shows required indicator when required is true", () => {
		render(
			<I18nWrapper>
				<FormField label="Hostname" required htmlFor="host">
					<input id="host" />
				</FormField>
			</I18nWrapper>,
		);
		const label = screen.getByText("Hostname");
		expect(label.className).toContain("after:content");
	});

	it("does not show required indicator when required is not set", () => {
		render(
			<I18nWrapper>
				<FormField label="Hostname" htmlFor="host">
					<input id="host" />
				</FormField>
			</I18nWrapper>,
		);
		const label = screen.getByText("Hostname");
		expect(label.className).not.toContain("after:content");
	});

	it("renders children", () => {
		render(
			<I18nWrapper>
				<FormField label="Hostname" htmlFor="host">
					<input id="host" data-testid="child-input" />
				</FormField>
			</I18nWrapper>,
		);
		expect(screen.getByTestId("child-input")).toBeInTheDocument();
	});

	it("renders error messages from string array", () => {
		render(
			<I18nWrapper>
				<FormField label="Hostname" htmlFor="host" errors={["validation.hostRequired", "validation.hostInvalid"]}>
					<input id="host" />
				</FormField>
			</I18nWrapper>,
		);
		expect(screen.getByText("Host is required")).toBeInTheDocument();
		expect(screen.getByText("Host must be a valid domain, IPv4, or IPv6 address")).toBeInTheDocument();
	});

	it("renders error messages from object with message property", () => {
		render(
			<I18nWrapper>
				<FormField label="Hostname" htmlFor="host" errors={[{ message: "validation.hostRequired" }]}>
					<input id="host" />
				</FormField>
			</I18nWrapper>,
		);
		expect(screen.getByText("Host is required")).toBeInTheDocument();
	});

	it("renders default error for unknown error types", () => {
		render(
			<I18nWrapper>
				<FormField label="Hostname" htmlFor="host" errors={[null]}>
					<input id="host" />
				</FormField>
			</I18nWrapper>,
		);
		expect(screen.getByText("Invalid value")).toBeInTheDocument();
	});

	it("renders default error for empty object", () => {
		render(
			<I18nWrapper>
				<FormField label="Hostname" htmlFor="host" errors={[{}]}>
					<input id="host" />
				</FormField>
			</I18nWrapper>,
		);
		expect(screen.getByText("Invalid value")).toBeInTheDocument();
	});

	it("renders icon when provided", () => {
		render(
			<I18nWrapper>
				<FormField label="Hostname" htmlFor="host" icon={<span data-testid="icon">*</span>}>
					<input id="host" />
				</FormField>
			</I18nWrapper>,
		);
		expect(screen.getByTestId("icon")).toBeInTheDocument();
	});
});
