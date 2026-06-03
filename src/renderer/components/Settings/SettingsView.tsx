import { type TranslationKey } from "@i18n/i18n";
import { Icon } from "@renderer/components/icons/Icon";
import { useI18n } from "@renderer/hooks/useI18n";
import { useTheme } from "@renderer/hooks/useTheme";
import { useSettingsStore } from "@renderer/store/settings";

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

export function SettingsView({ onBack }: SettingsViewProps) {
	const { t } = useI18n();
	const { theme, setTheme } = useTheme();
	const { locale, setLocale } = useSettingsStore();

	return (
		<div className="flex-1 flex items-start justify-center bg-surface overflow-auto">
			<div className="w-full max-w-2xl p-6 md:p-10">
				<div className="flex items-center gap-3 mb-6">
					<button
						type="button"
						aria-label={t("connection.back")}
						className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-container-high transition-colors"
						onClick={onBack}
					>
						<Icon name="arrow-left" size={18} />
					</button>
					<h2 className="text-lg font-semibold text-foreground">{t("settings.title")}</h2>
				</div>

				<div className="flex flex-col gap-8">
					{/* Appearance Section */}
					<section className="flex flex-col gap-3">
						<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
							{t("settings.appearance")}
						</h3>
						<div className="bg-surface-container rounded-xl border border-outline-variant p-4">
							<div className="flex flex-col gap-1 mb-3">
								<span className="text-sm font-medium text-foreground">{t("settings.theme")}</span>
								<span className="text-xs text-muted-foreground">{t("settings.themeDescription")}</span>
							</div>
							<div className="grid grid-cols-3 gap-2">
								{themeOptions.map((opt) => (
									<button
										key={opt.value}
										className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all duration-200 ${
											theme === opt.value
												? "border-primary bg-primary/10 text-primary"
												: "border-outline-variant hover:border-outline hover:bg-surface-container-high text-muted-foreground hover:text-foreground"
										}`}
										onClick={() => {
											setTheme(opt.value);
										}}
									>
										<Icon name={opt.icon} size={20} />
										<span className="text-xs font-medium">{t(opt.label)}</span>
									</button>
								))}
							</div>
						</div>
					</section>

					{/* Language Section */}
					<section className="flex flex-col gap-3">
						<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
							{t("settings.language")}
						</h3>
						<div className="bg-surface-container rounded-xl border border-outline-variant p-4">
							<div className="flex flex-col gap-1 mb-3">
								<span className="text-xs text-muted-foreground">{t("settings.languageDescription")}</span>
							</div>
							<div className="flex flex-col gap-2">
								{languageOptions.map((opt) => (
									<button
										key={opt.value}
										className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
											locale === opt.value
												? "border-primary bg-primary/10 text-primary"
												: "border-outline-variant hover:border-outline hover:bg-surface-container-high text-muted-foreground hover:text-foreground"
										}`}
										onClick={() => {
											setLocale(opt.value);
										}}
									>
										<span
											className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
												locale === opt.value ? "border-primary" : "border-outline-variant"
											}`}
										>
											{locale === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
										</span>
										<span className="text-sm font-medium">{t(opt.label)}</span>
									</button>
								))}
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
