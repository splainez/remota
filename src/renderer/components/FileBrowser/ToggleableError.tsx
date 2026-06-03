import { useI18n } from "@renderer/hooks/useI18n";
import { useState } from "react";

interface ToggleableErrorProps {
	message: string;
	detail?: string;
}

export function ToggleableError({ message, detail }: ToggleableErrorProps) {
	const { t } = useI18n();
	const [showDetail, setShowDetail] = useState(false);

	return (
		<div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-1 p-4">
			<span>{message}</span>
			{detail && (
				<>
					<button
						className="text-xs text-primary hover:underline cursor-pointer mt-1"
						onClick={() => {
							setShowDetail((v) => !v);
						}}
					>
						{showDetail ? t("remote.hideDetails") : t("remote.showDetails")}
					</button>
					{showDetail && (
						<pre className="text-xs text-muted-foreground bg-surface-container p-2 rounded mt-1 max-w-full overflow-auto whitespace-pre-wrap break-all">
							{detail}
						</pre>
					)}
				</>
			)}
		</div>
	);
}
