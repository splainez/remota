import { type TranslationKey } from "@i18n/i18n";
import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";
import { useTheme } from "@renderer/hooks/useTheme";
import { cn } from "@renderer/lib/utils";
import { useSettingsStore } from "@renderer/store/settings";
import {
	MAX_PARALLEL_TRANSFERS_MAX,
	MAX_PARALLEL_TRANSFERS_MIN,
	MAX_SESSIONS_MAX,
	MAX_SESSIONS_MIN,
	RETENTION_MS_MAX,
	RETENTION_MS_MIN,
} from "@shared/app-config-schema";
import type { RemoteDoubleClickAction, TerminalAppId } from "@shared/app-config-schema";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface SettingsViewProps {
	onBack: () => void;
}

const themeOptions: { value: "dark" | "light" | "system"; label: TranslationKey; icon: "lock" | "eye" | "layout" }[] = [
	{ value: "dark", label: "theme.dark", icon: "lock" },
	{ value: "light", label: "theme.light", icon: "eye" },
	{ value: "system", label: "theme.system", icon: "layout" },
];

const languageOptions: { value: "en" | "es"; label: TranslationKey }[] = [
	{ value: "en", label: "settings.languageEnglish" },
	{ value: "es", label: "settings.languageSpanish" },
];

type TerminalOptionValue = "none" | TerminalAppId;

const remoteDoubleClickOptions: { value: RemoteDoubleClickAction; label: TranslationKey }[] = [
	{ value: "open", label: "settings.remoteDoubleClickOpen" },
	{ value: "edit", label: "settings.remoteDoubleClickEdit" },
];

const terminalOptions: { value: TerminalOptionValue; label: TranslationKey }[] = [
	{ value: "none", label: "settings.terminalNone" },
	{ value: "windows-terminal", label: "settings.terminalWindowsTerminal" },
	{ value: "kitty", label: "settings.terminalKitty" },
	{ value: "ghostty", label: "settings.terminalGhostty" },
	{ value: "alacritty", label: "settings.terminalAlacritty" },
	{ value: "iterm2", label: "settings.terminalIterm2" },
	{ value: "terminal-app", label: "settings.terminalTerminalApp" },
	{ value: "gnome-terminal", label: "settings.terminalGnomeTerminal" },
	{ value: "konsole", label: "settings.terminalKonsole" },
];

export function SettingsView({ onBack }: SettingsViewProps) {
	const { t } = useI18n();
	const { theme, setTheme } = useTheme();
	const {
		locale,
		setLocale,
		externalTerminal,
		setExternalTerminal,
		availableTerminals,
		pendingRecoveryToast,
		clearPendingRecoveryToast,
		maxParallelTransfers,
		setMaxParallelTransfers,
		maxSessions,
		setMaxSessions,
		retentionMs,
		setRetentionMs,
		remoteDoubleClickAction,
		setRemoteDoubleClickAction,
	} = useSettingsStore();

	const currentTerminal: TerminalOptionValue = externalTerminal ?? "none";
	const retentionEnabled = retentionMs !== undefined;
	const retentionSeconds = retentionMs !== undefined ? Math.round(retentionMs / 1000) : 30;
	const [retentionInput, setRetentionInput] = useState(String(retentionSeconds));
	const [importing, setImporting] = useState(false);
	const [exporting, setExporting] = useState(false);

	useEffect(() => {
		if (!pendingRecoveryToast) return;
		const option = terminalOptions.find((o) => o.value === pendingRecoveryToast);
		const label = option ? t(option.label) : pendingRecoveryToast;
		toast.warning(t("settings.terminalRecoveredToast", { name: label }));
		clearPendingRecoveryToast();
	}, [pendingRecoveryToast, clearPendingRecoveryToast, t]);

	const notFoundLabel = t("settings.terminalNotFound");

	const handleImportSshConfig = () => {
		setImporting(true);
		window.api.connections
			.importSshConfig()
			.then((result) => {
				if (result.imported > 0 && result.errors.length === 0) {
					toast.success(t("settings.importSshConfigSuccess", { count: String(result.imported) }));
				} else if (result.imported > 0) {
					toast.warning(t("settings.importSshConfigPartial", { count: String(result.imported) }));
				} else if (result.errors.length > 0) {
					toast.error(t("settings.importSshConfigFailed", { error: result.errors[0] }));
				}
			})
			.catch((err: unknown) => {
				toast.error(t("settings.importSshConfigFailed", { error: (err as Error).message }));
			})
			.finally(() => {
				setImporting(false);
			});
	};

	const handleExportSshConfig = () => {
		setExporting(true);
		window.api.connections
			.exportSshConfig()
			.then((result) => {
				if (result.exported > 0 && result.errors.length === 0) {
					toast.success(t("settings.exportSshConfigSuccess", { count: String(result.exported) }));
				} else if (result.exported > 0) {
					toast.warning(t("settings.exportSshConfigPartial", { count: String(result.exported) }));
				} else if (result.errors.length > 0) {
					toast.error(t("settings.exportSshConfigFailed", { error: result.errors[0] }));
				}
			})
			.catch((err: unknown) => {
				toast.error(t("settings.exportSshConfigFailed", { error: (err as Error).message }));
			})
			.finally(() => {
				setExporting(false);
			});
	};

	return (
		<div className="flex flex-1 items-start justify-center overflow-auto bg-surface">
			<div className="w-full max-w-2xl p-6 md:p-10">
				<div className="mb-6 flex items-center gap-3">
					<Button type="button" variant="ghost" size="icon" aria-label={t("connection.back")} onClick={onBack}>
						<Icon name="arrow-left" size={18} />
					</Button>
					<h2 className="text-lg font-semibold text-foreground">{t("settings.title")}</h2>
				</div>

				<div className="flex flex-col gap-8">
					{/* Appearance Section */}
					<section className="flex flex-col gap-3">
						<h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
							{t("settings.appearance")}
						</h3>
						<div className="rounded-xl border border-outline-variant bg-surface-container p-4">
							<div className="mb-3 flex flex-col gap-1">
								<span className="text-sm font-medium text-foreground">{t("settings.theme")}</span>
								<span className="text-xs text-muted-foreground">{t("settings.themeDescription")}</span>
							</div>
							<div className="grid grid-cols-3 gap-2">
								{themeOptions.map((opt) => (
									<Button
										key={opt.value}
										type="button"
										variant={theme === opt.value ? "selected" : "outline"}
										size="default"
										className="h-auto flex-col gap-2 p-3"
										onClick={() => {
											setTheme(opt.value);
										}}
									>
										<Icon name={opt.icon} size={20} />
										<span className="text-xs font-medium">{t(opt.label)}</span>
									</Button>
								))}
							</div>
						</div>
					</section>

					{/* Transfers Section */}
					<section className="flex flex-col gap-3">
						<h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
							{t("settings.transfers")}
						</h3>
						<div className="rounded-xl border border-outline-variant bg-surface-container p-4">
							<div className="mb-3 flex flex-col gap-1">
								<span className="text-sm font-medium text-foreground">{t("settings.maxParallelTransfers")}</span>
								<span className="text-xs text-muted-foreground">{t("settings.maxParallelTransfersDescription")}</span>
							</div>
							<input
								type="number"
								min={MAX_PARALLEL_TRANSFERS_MIN}
								max={MAX_PARALLEL_TRANSFERS_MAX}
								step={1}
								value={maxParallelTransfers}
								onChange={(e) => {
									const parsed = Number(e.target.value);
									if (Number.isFinite(parsed) && parsed > 0) {
										setMaxParallelTransfers(parsed);
									}
								}}
								className="
									h-8 w-20 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface
									focus:ring-2 focus:ring-primary focus:outline-none
								"
							/>
						</div>
						<div className="rounded-xl border border-outline-variant bg-surface-container p-4">
							<div className="mb-3 flex flex-col gap-1">
								<span className="text-sm font-medium text-foreground">{t("settings.retentionMs")}</span>
								<span className="text-xs text-muted-foreground">{t("settings.retentionMsDescription")}</span>
							</div>
							<div className="flex items-center gap-3">
								<button
									type="button"
									role="switch"
									aria-checked={retentionEnabled}
									className={cn(
										`
											relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
											transition-colors
										`,
										retentionEnabled ? "bg-primary" : "bg-outline-variant",
									)}
									onClick={() => {
										if (retentionEnabled) {
											setRetentionMs(undefined);
											setRetentionInput("30");
										} else {
											setRetentionMs(30_000);
											setRetentionInput("30");
										}
									}}
								>
									<span
										className={cn(
											"pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
											retentionEnabled ? "translate-x-5" : "translate-x-0",
										)}
									/>
								</button>
								{retentionEnabled && (
									<div className="flex items-center gap-2">
										<input
											type="number"
											min={Math.round(RETENTION_MS_MIN / 1000)}
											max={Math.round(RETENTION_MS_MAX / 1000)}
											step={5}
											value={retentionInput}
											onChange={(e) => {
												setRetentionInput(e.target.value);
												const parsed = Number(e.target.value);
												if (Number.isFinite(parsed) && parsed > 0) {
													setRetentionMs(parsed * 1000);
												}
											}}
											className="
												h-8 w-20 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface
												focus:ring-2 focus:ring-primary focus:outline-none
											"
										/>
										<span className="text-sm text-on-surface-variant">{t("settings.retentionMsSeconds")}</span>
									</div>
								)}
							</div>
						</div>
					</section>

					{/* Connections Section */}
					<section className="flex flex-col gap-3">
						<h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
							{t("settings.connections")}
						</h3>
						<div className="rounded-xl border border-outline-variant bg-surface-container p-4">
							<div className="mb-3 flex flex-col gap-1">
								<span className="text-sm font-medium text-foreground">{t("settings.maxSessions")}</span>
								<span className="text-xs text-muted-foreground">{t("settings.maxSessionsDescription")}</span>
							</div>
							<input
								type="number"
								min={MAX_SESSIONS_MIN}
								max={MAX_SESSIONS_MAX}
								step={1}
								value={maxSessions}
								onChange={(e) => {
									const parsed = Number(e.target.value);
									if (Number.isFinite(parsed) && parsed > 0) {
										setMaxSessions(parsed);
									}
								}}
								className="
									h-8 w-20 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface
									focus:ring-2 focus:ring-primary focus:outline-none
								"
							/>
						</div>
						<div className="rounded-xl border border-outline-variant bg-surface-container p-4">
							<div className="mb-3 flex flex-col gap-1">
								<span className="text-sm font-medium text-foreground">{t("settings.importSshConfig")}</span>
								<span className="text-xs text-muted-foreground">{t("settings.importSshConfigDescription")}</span>
							</div>
							<Button
								type="button"
								variant="outline"
								size="default"
								className="h-auto justify-start gap-3 p-3"
								onClick={handleImportSshConfig}
								disabled={importing}
							>
								<Icon name="file" size={16} />
								<span className="text-sm font-medium">{t("settings.importSshConfigFile")}</span>
							</Button>
						</div>
						<div className="rounded-xl border border-outline-variant bg-surface-container p-4">
							<div className="mb-3 flex flex-col gap-1">
								<span className="text-sm font-medium text-foreground">{t("settings.exportSshConfig")}</span>
								<span className="text-xs text-muted-foreground">{t("settings.exportSshConfigDescription")}</span>
							</div>
							<Button
								type="button"
								variant="outline"
								size="default"
								className="h-auto justify-start gap-3 p-3"
								onClick={handleExportSshConfig}
								disabled={exporting}
							>
								<Icon name="file" size={16} />
								<span className="text-sm font-medium">{t("settings.exportSshConfigFile")}</span>
							</Button>
						</div>
					</section>

					{/* File Behavior Section */}
					<section className="flex flex-col gap-3">
						<h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
							{t("settings.fileBehavior")}
						</h3>
						<div className="rounded-xl border border-outline-variant bg-surface-container p-4">
							<div className="mb-3 flex flex-col gap-1">
								<span className="text-sm font-medium text-foreground">{t("settings.remoteDoubleClickAction")}</span>
								<span className="text-xs text-muted-foreground">
									{t("settings.remoteDoubleClickActionDescription")}
								</span>
							</div>
							<div className="flex flex-col gap-2">
								{remoteDoubleClickOptions.map((opt) => (
									<Button
										key={opt.value}
										type="button"
										variant={remoteDoubleClickAction === opt.value ? "selected" : "outline"}
										size="default"
										className="h-auto justify-start gap-3 p-3"
										onClick={() => {
											setRemoteDoubleClickAction(opt.value);
										}}
									>
										<span
											className={cn(
												"flex size-3 items-center justify-center rounded-full border-2",
												remoteDoubleClickAction === opt.value ? "border-primary" : "border-outline-variant",
											)}
										>
											{remoteDoubleClickAction === opt.value && <span className="size-1.5 rounded-full bg-primary" />}
										</span>
										<span className="text-sm font-medium">{t(opt.label)}</span>
									</Button>
								))}
							</div>
						</div>
					</section>

					{/* Language Section */}
					<section className="flex flex-col gap-3">
						<h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
							{t("settings.language")}
						</h3>
						<div className="rounded-xl border border-outline-variant bg-surface-container p-4">
							<div className="mb-3 flex flex-col gap-1">
								<span className="text-xs text-muted-foreground">{t("settings.languageDescription")}</span>
							</div>
							<div className="flex flex-col gap-2">
								{languageOptions.map((opt) => (
									<Button
										key={opt.value}
										type="button"
										variant={locale === opt.value ? "selected" : "outline"}
										size="default"
										className="h-auto justify-start gap-3 p-3"
										onClick={() => {
											setLocale(opt.value);
										}}
									>
										<span
											className={cn(
												"flex size-3 items-center justify-center rounded-full border-2",
												locale === opt.value ? "border-primary" : "border-outline-variant",
											)}
										>
											{locale === opt.value && <span className="size-1.5 rounded-full bg-primary" />}
										</span>
										<span className="text-sm font-medium">{t(opt.label)}</span>
									</Button>
								))}
							</div>
						</div>
					</section>

					{/* Terminal Section */}
					<section className="flex flex-col gap-3">
						<h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
							{t("settings.terminal")}
						</h3>
						<div className="rounded-xl border border-outline-variant bg-surface-container p-4">
							<div className="mb-3 flex flex-col gap-1">
								<span className="text-sm font-medium text-foreground">{t("settings.externalTerminal")}</span>
								<span className="text-xs text-muted-foreground">{t("settings.externalTerminalDescription")}</span>
							</div>
							<div className="flex flex-col gap-2">
								{terminalOptions.map((opt) => {
									const isNone = opt.value === "none";
									const isAvailable = isNone || availableTerminals.includes(opt.value as TerminalAppId);
									const isActive = currentTerminal === opt.value;
									const showNotFound = !isAvailable;
									return (
										<Button
											key={opt.value}
											type="button"
											variant={isActive ? "selected" : "outline"}
											size="default"
											disabled={!isAvailable}
											className={cn("h-auto justify-start gap-3 p-3", !isAvailable && "cursor-not-allowed opacity-50")}
											onClick={() => {
												if (!isAvailable) return;
												setExternalTerminal(opt.value === "none" ? undefined : opt.value);
											}}
										>
											<span
												className={cn(
													"flex size-3 items-center justify-center rounded-full border-2",
													isActive ? "border-primary" : "border-outline-variant",
												)}
											>
												{isActive && <span className="size-1.5 rounded-full bg-primary" />}
											</span>
											<span className="flex-1 text-left text-sm font-medium">
												{t(opt.label)}
												{showNotFound && (
													<span className="ml-2 text-xs font-normal text-muted-foreground">{notFoundLabel}</span>
												)}
											</span>
										</Button>
									);
								})}
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
