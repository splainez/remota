import { useTransferStore } from "@renderer/store/transfer";
import { useCallback, useEffect, useRef } from "react";

const SPEED_WINDOW_MS = 2_000;
const MAX_SAMPLES = 10;

interface Sample {
	bytes: number;
	timestamp: number;
}

function computeSpeed(history: Map<string, Sample[]>, id: string, now: number): number {
	const samples = history.get(id);
	if (samples === undefined || samples.length < 2) return 0;

	const cutoff = now - SPEED_WINDOW_MS;
	let oldest = samples[0];
	let newest = samples[0];
	let count = 0;

	for (const s of samples) {
		if (s.timestamp >= cutoff) {
			if (count === 0) oldest = s;
			newest = s;
			count++;
		}
	}

	if (count < 2) return 0;
	const elapsed = (newest.timestamp - oldest.timestamp) / 1_000;
	return elapsed > 0 ? (newest.bytes - oldest.bytes) / elapsed : 0;
}

export function useTransferSpeed(connectionId: number): (itemId: string) => number {
	const rawItems = useTransferStore((s) => s.byConnection[connectionId]);
	const items = rawItems ?? [];
	const historyRef = useRef<Map<string, Sample[]>>(new Map());
	const speedsRef = useRef<Map<string, number>>(new Map());

	useEffect(() => {
		const history = historyRef.current;
		const now = Date.now();

		const existingIds = new Set(items.map((i) => i.id));

		for (const [id] of history) {
			if (!existingIds.has(id)) {
				history.delete(id);
				speedsRef.current.delete(id);
			}
		}

		const next = new Map<string, number>();
		for (const item of items) {
			if (item.status !== "active") {
				history.delete(item.id);
				next.set(item.id, 0);
				continue;
			}

			const samples = history.get(item.id) ?? [];
			samples.push({ bytes: item.transferredBytes, timestamp: now });
			if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
			history.set(item.id, samples);
			next.set(item.id, computeSpeed(history, item.id, now));
		}

		speedsRef.current = next;
	}, [items]);

	useEffect(() => {
		return () => {
			historyRef.current.clear();
			speedsRef.current.clear();
		};
	}, []);

	return useCallback((itemId: string) => speedsRef.current.get(itemId) ?? 0, []);
}
