import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";

interface ConnectionErrorViewProps {
	technicalDetail: string;
	onReconnect?: () => void;
}

export function ConnectionErrorView({ technicalDetail, onReconnect }: ConnectionErrorViewProps) {
	const { t } = useI18n();
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-muted-foreground">
			<span className="text-sm font-semibold">{t("remote.connectionLost")}</span>
			{onReconnect && (
				<Button variant="default" size="sm" onClick={onReconnect}>
					{t("remote.reconnect")}
				</Button>
			)}
			<pre
				className="
					mt-1 max-w-full overflow-auto rounded-sm bg-surface-container p-2 text-xs break-all whitespace-pre-wrap
					text-muted-foreground
				"
			>
				{technicalDetail}
			</pre>
		</div>
	);
}
