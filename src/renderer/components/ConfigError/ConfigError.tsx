import { useState, useEffect, useCallback } from "react";
import { Icon } from "@renderer/components/icons/Icon";
import { useI18n } from "@renderer/hooks/useI18n";
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
				<Icon name="warning" size={48} className="mb-4 mx-auto text-destructive opacity-80" />

				<h1 className="text-headline-lg font-bold text-foreground mb-2">{t("config.error.title")}</h1>

				<p className="text-body-lg text-muted-foreground mb-6">{t("config.error.message")}</p>

				<p className="text-body-md text-muted-foreground mb-6">{t("config.error.resolution")}</p>

				<div className="bg-surface-container-low rounded-lg p-4 mb-6 text-left">
					<p className="text-label-md text-muted-foreground mb-1">{t("config.error.filePath")}</p>
					<code className="text-mono-sm text-foreground break-all select-all">{error.filePath}</code>
				</div>

				{error.issues.length > 0 && (
					<div className="bg-surface-container rounded-lg p-4 mb-6 text-left max-h-40 overflow-y-auto">
						<p className="text-label-md text-muted-foreground mb-2">{t("config.error.details")}</p>
						<ul className="space-y-1">
							{error.issues.map((issue, i) => (
								<li key={i} className="text-body-md text-muted-foreground">
									• {issue}
								</li>
							))}
						</ul>
					</div>
				)}

				<div className="flex gap-3 justify-center">
					<button
						className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-body-md font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
						onClick={handleRetry}
					>
						{t("config.error.retry")}
					</button>
					<button
						className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-body-md font-medium bg-surface-container text-foreground border border-outline-variant hover:bg-surface-container-high transition-colors"
						onClick={handleIgnore}
					>
						{t("config.error.ignore")}
					</button>
				</div>
			</div>
		</div>
	);
}
