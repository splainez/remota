import { type TranslationKey } from "@i18n/i18n";
import { Icon } from "@renderer/components/icons/Icon";
import { FormField } from "./FormField";
import { useI18n } from "@renderer/hooks/useI18n";
import {
	hostSchema,
	portSchema,
	usernameSchema,
	passwordSchema,
	privateKeyPathSchema,
	DEFAULT_PORT,
} from "@shared/validation";

interface FieldProps<T = string> {
	state: { value: T; meta: { errors: unknown[] } };
	handleBlur: () => void;
	handleChange: (v: T) => void;
}

const inputClass =
	"px-3 py-[7px] border border-input rounded-lg bg-background text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 w-full";

interface SftpFieldsProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: any;
}

export function SftpFields({ form }: SftpFieldsProps) {
	const { t } = useI18n();
	return (
		<>
			<div className="grid grid-cols-[1fr_auto] gap-4">
				<form.Field name="host" validators={{ onBlur: hostSchema }}>
					{(field: FieldProps) => (
						<FormField
							label={t("connection.host")}
							required
							htmlFor="conn-host"
							icon={<Icon name="server" size={14} />}
							errors={field.state.meta.errors}
						>
							<input
								id="conn-host"
								className={`${inputClass} pl-8`}
								type="text"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => {
									field.handleChange(e.target.value);
								}}
								placeholder="ftp.example.com"
							/>
						</FormField>
					)}
				</form.Field>

				<form.Field name="port" validators={{ onBlur: portSchema }}>
					{(field: FieldProps<number>) => (
						<FormField label={t("connection.port")} required htmlFor="conn-port" errors={field.state.meta.errors}>
							<input
								id="conn-port"
								className={`${inputClass} w-24`}
								type="number"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => {
									const val = e.target.valueAsNumber;
									if (Number.isNaN(val)) {
										const protocol = (form as unknown as { state: { values: { protocol: string } } }).state.values
											.protocol;
										field.handleChange(DEFAULT_PORT[protocol] ?? 22);
									} else {
										field.handleChange(val);
									}
								}}
							/>
						</FormField>
					)}
				</form.Field>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<form.Field name="username" validators={{ onBlur: usernameSchema }}>
					{(field: FieldProps) => (
						<FormField
							label={t("connection.username")}
							required
							htmlFor="conn-username"
							icon={<Icon name="person" size={14} />}
							errors={field.state.meta.errors}
						>
							<input
								id="conn-username"
								className={`${inputClass} pl-8`}
								type="text"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => {
									field.handleChange(e.target.value);
								}}
								placeholder="root"
							/>
						</FormField>
					)}
				</form.Field>

				<form.Subscribe selector={(s: { values: { authType: string } }) => s.values.authType}>
					{(authType: string) => {
						return (
							<>
								{authType === "password" && (
									<form.Field name="password" validators={{ onBlur: passwordSchema }}>
										{(field: FieldProps) => (
											<FormField
												label={t("connection.password")}
												required
												htmlFor="conn-password"
												errors={field.state.meta.errors}
											>
												<input
													id="conn-password"
													className={inputClass}
													type="password"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => {
														field.handleChange(e.target.value);
													}}
												/>
											</FormField>
										)}
									</form.Field>
								)}
								{authType === "key" && (
									<form.Field name="privateKeyPath" validators={{ onBlur: privateKeyPathSchema }}>
										{(field: FieldProps) => (
											<FormField
												label={t("connection.privateKey")}
												required
												htmlFor="conn-privatekey"
												errors={field.state.meta.errors}
											>
												<input
													id="conn-privatekey"
													className={inputClass}
													type="text"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => {
														field.handleChange(e.target.value);
													}}
													placeholder="~/.ssh/id_rsa"
												/>
											</FormField>
										)}
									</form.Field>
								)}
								{authType === "agent" && (
									<FormField label={t("connection.password")}>
										<div className={`${inputClass} text-muted-foreground text-sm flex items-center gap-2`}>
											<Icon name="shield" size={14} />
											{t("connection.authAgent")}
										</div>
									</FormField>
								)}
							</>
						);
					}}
				</form.Subscribe>
			</div>

			<form.Field name="authType">
				{(field: FieldProps) => (
					<FormField label={t("connection.authType")}>
						<div className="flex gap-4">
							{(["password", "key", "agent"] as const).map((at) => {
								const labels: Record<string, TranslationKey> = {
									password: "connection.authPassword",
									key: "connection.authKey",
									agent: "connection.authAgent",
								};
								return (
									<label
										key={at}
										className="flex items-center gap-1.5 cursor-pointer text-sm text-foreground [&_input]:accent-primary"
									>
										<input
											type="radio"
											name="authType"
											value={at}
											checked={field.state.value === at}
											onBlur={field.handleBlur}
											onChange={() => {
												field.handleChange(at);
											}}
										/>
										{t(labels[at])}
									</label>
								);
							})}
						</div>
					</FormField>
				)}
			</form.Field>
		</>
	);
}
