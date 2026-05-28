import { useEffect, useRef, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

interface UseXTermOptions {
	sessionId: string;
	type: "local" | "remote";
	connectionId?: number;
	containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useXTerm({ sessionId, type, connectionId, containerRef }: UseXTermOptions) {
	const xtermRef = useRef<XTerm | null>(null);
	const fitAddonRef = useRef<FitAddon | null>(null);

	const handleData = useCallback(
		(data: string) => {
			void window.api.terminal.write(sessionId, data);
		},
		[sessionId],
	);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const term = new XTerm({
			cursorBlink: true,
			fontFamily: "JetBrains Mono, Consolas, 'Courier New', monospace",
			fontSize: 13,
			allowProposedApi: true,
			theme: {
				background: "#0d141b",
				foreground: "#dce3ed",
				cursor: "#dce3ed",
			},
		});

		const fitAddon = new FitAddon();
		term.loadAddon(fitAddon);
		term.open(container);
		term.focus();
		fitAddon.fit();

		xtermRef.current = term;
		fitAddonRef.current = fitAddon;

		const unsubscribeData = window.api.terminal.onData(sessionId, (data: string) => {
			term.write(data);
		});

		term.onData(handleData);

		void window.api.terminal.spawn(sessionId, type, connectionId);

		const resizeObserver = new ResizeObserver(() => {
			if (fitAddonRef.current) {
				fitAddonRef.current.fit();
			}
			if (xtermRef.current) {
				const { cols, rows } = xtermRef.current;
				void window.api.terminal.resize(sessionId, cols, rows);
			}
		});

		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
			unsubscribeData();
			term.dispose();
			void window.api.terminal.kill(sessionId);
			xtermRef.current = null;
			fitAddonRef.current = null;
		};
	}, [sessionId, type, connectionId, handleData, containerRef]);
}
