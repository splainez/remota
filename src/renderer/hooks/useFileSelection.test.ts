import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileSelection } from "./useFileSelection";

describe("useFileSelection", () => {
	const sortedNames = ["a.txt", "b.txt", "c.txt", "d.txt", "e.txt"];

	it("selects a single entry with plain click", () => {
		const { result } = renderHook(() => useFileSelection());
		act(() => { result.current.handleSelectEntry("b.txt", false, false, sortedNames); });
		expect(result.current.selectedNames).toEqual(["b.txt"]);
	});

	it("adds to selection with ctrl+click", () => {
		const { result } = renderHook(() => useFileSelection());
		act(() => { result.current.handleSelectEntry("a.txt", false, false, sortedNames); });
		act(() => { result.current.handleSelectEntry("c.txt", true, false, sortedNames); });
		expect(result.current.selectedNames).toEqual(["a.txt", "c.txt"]);
	});

	it("removes from selection with ctrl+click on selected", () => {
		const { result } = renderHook(() => useFileSelection());
		act(() => { result.current.handleSelectEntry("a.txt", false, false, sortedNames); });
		act(() => { result.current.handleSelectEntry("b.txt", true, false, sortedNames); });
		act(() => { result.current.handleSelectEntry("a.txt", true, false, sortedNames); });
		expect(result.current.selectedNames).toEqual(["b.txt"]);
	});

	it("selects range with shift+click", () => {
		const { result } = renderHook(() => useFileSelection());
		act(() => { result.current.handleSelectEntry("b.txt", false, false, sortedNames); });
		act(() => { result.current.handleSelectEntry("d.txt", false, true, sortedNames); });
		expect(result.current.selectedNames).toEqual(["b.txt", "c.txt", "d.txt"]);
	});

	it("clears selection", () => {
		const { result } = renderHook(() => useFileSelection());
		act(() => { result.current.handleSelectEntry("a.txt", false, false, sortedNames); });
		act(() => { result.current.clearSelection(); });
		expect(result.current.selectedNames).toEqual([]);
	});

	it("replaces selection on plain click", () => {
		const { result } = renderHook(() => useFileSelection());
		act(() => { result.current.handleSelectEntry("a.txt", false, false, sortedNames); });
		act(() => { result.current.handleSelectEntry("e.txt", false, false, sortedNames); });
		expect(result.current.selectedNames).toEqual(["e.txt"]);
	});
});
