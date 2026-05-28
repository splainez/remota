import { useState, useCallback } from "react";

export function useTerminalToggle() {
	const [visible, setVisible] = useState(false);

	const toggle = useCallback(() => {
		setVisible((prev) => !prev);
	}, []);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.ctrlKey && e.key === "`") {
				e.preventDefault();
				toggle();
			}
		},
		[toggle],
	);

	return { visible, toggle, handleKeyDown };
}
