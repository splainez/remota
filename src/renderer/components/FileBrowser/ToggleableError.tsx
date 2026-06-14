import { Button } from "@renderer/components/ui/button";
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
		<div className="flex flex-1 flex-col items-center justify-center gap-1 p-4 text-sm text-muted-foreground">
			<span>{message}</span>
			{detail && (
				<>
					<Button
						variant="link"
						size="sm"
						className="mt-1 h-auto p-0 text-xs"
						onClick={() => {
							setShowDetail((v) => !v);
						}}
					>
						{showDetail ? t("remote.hideDetails") : t("remote.showDetails")}
					</Button>
					{showDetail && (
						<pre
							className="
								mt-1 max-w-full overflow-auto rounded-sm bg-surface-container p-2 text-xs break-all whitespace-pre-wrap
								text-muted-foreground
							"
						>
							{detail}
						</pre>
					)}
				</>
			)}
		</div>
	);
}
