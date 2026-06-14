import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";
import { useState, useEffect, useCallback } from "react";
interface ConfigErrorData {
	message: string;
	filePath: string;
	issues: string[];
}

export function ConfigError() {
	const { t } = useI18n();
	const [error, setError] = useState<ConfigErrorData | null>(null);
	const [ignore, setIgnore] = useState(false);
	const [resolved, setResolved] = useState(false);

	useEffect(() => {
		window.api.app
			.getConfigError()
			.then((err) => {
				if (err) setError(err);
			})
			.catch(() => {
				// config error already set via onConfigError or initial check
			});
	}, []);

	useEffect(() => {
		const cleanup = window.api.app.onConfigError((data) => {
			setError(data);
		});
		return cleanup;
	}, []);

	const handleRetry = useCallback(() => {
		setResolved(true);
		window.location.reload();
	}, []);

	const handleIgnore = useCallback(() => {
		setIgnore(true);
	}, []);

	if (resolved || ignore || !error) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-8">
			<div className="w-full max-w-lg text-center">
				<Icon name="warning" size={48} className="mx-auto mb-4 text-destructive opacity-80" />

				<h1 className="mb-2 font-bold text-foreground">{t("config.error.title")}</h1>

				<p className="mb-6 text-muted-foreground">{t("config.error.message")}</p>

				<p className="mb-6 text-muted-foreground">{t("config.error.resolution")}</p>

				<div className="mb-6 rounded-lg bg-surface-container-low p-4 text-left">
					<p className="mb-1 text-muted-foreground">{t("config.error.filePath")}</p>
					<code className="break-all text-foreground select-all">{error.filePath}</code>
				</div>

				{error.issues.length > 0 && (
					<div className="mb-6 max-h-40 overflow-y-auto rounded-lg bg-surface-container p-4 text-left">
						<p className="mb-2 text-muted-foreground">{t("config.error.details")}</p>
						<ul className="space-y-1">
							{error.issues.map((issue, i) => (
								<li key={i} className="text-muted-foreground">
									• {issue}
								</li>
							))}
						</ul>
					</div>
				)}

				<div className="flex justify-center gap-3">
					<Button variant="default" size="default" onClick={handleRetry}>
						{t("config.error.retry")}
					</Button>
					<Button variant="outline" size="default" onClick={handleIgnore}>
						{t("config.error.ignore")}
					</Button>
				</div>
			</div>
		</div>
	);
}
