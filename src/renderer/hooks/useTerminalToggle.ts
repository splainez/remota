import { useCallback, useState } from "react";

export function useTerminalToggle(initial = false) {
	const [visible, setVisible] = useState(initial);

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
