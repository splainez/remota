import { t } from "../../../i18n";
import { Button } from "../ui/button";

interface ConnectionErrorViewProps {
	technicalDetail: string;
	onReconnect?: () => void;
}

export function ConnectionErrorView({ technicalDetail, onReconnect }: ConnectionErrorViewProps) {
	return (
		<div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-muted-foreground">
			<span className="text-sm font-semibold">{t("remote.connectionLost")}</span>
			{onReconnect && (
				<Button variant="default" size="sm" onClick={onReconnect}>
					{t("remote.reconnect")}
				</Button>
			)}
			<pre className="text-xs text-muted-foreground bg-surface-container p-2 rounded mt-1 max-w-full overflow-auto whitespace-pre-wrap break-all">
				{technicalDetail}
			</pre>
		</div>
	);
}
