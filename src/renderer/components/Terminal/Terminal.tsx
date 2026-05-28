import { useRef } from "react";
import { useXTerm } from "../../hooks/useXTerm";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
	sessionId: string;
	type: "local" | "remote";
	connectionId?: number;
}

export function Terminal({ sessionId, type, connectionId }: TerminalProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useXTerm({ sessionId, type, connectionId, containerRef });

	return <div ref={containerRef} className="h-full w-full" />;
}
