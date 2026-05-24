import { useForm } from "@tanstack/react-form";
import { t } from "../../../i18n";
import type { Connection, NewConnection } from "../../../shared/types";
import {
	connectionFormSchema,
	hostSchema,
	portSchema,
	usernameSchema,
	passwordSchema,
	privateKeyPathSchema,
	nameSchema,
	authTypes,
	DEFAULT_PORT,
} from "../../../shared/validation";

interface ConnectionFormProps {
	initial: Connection | null;
	onSave: (data: NewConnection) => Promise<void>;
	onCancel: () => void;
}

const PROTOCOLS = ["sftp", "scp", "s3"] as const;
const AUTH_LABELS: Record<string, string> = {
	password: "connection.authPassword",
	key: "connection.authKey",
	agent: "connection.authAgent",
};

const inputClass = "px-2.5 py-[7px] border border-gray-400 rounded bg-white text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const labelClass = "text-xs font-medium text-gray-500";
const errorClass = "text-xs text-red-600 mt-0.5";
const requiredLabelClass = `${labelClass} after:content-['_*'] after:text-red-500 after:ml-0.5`;

function errorMessage(err: unknown): string {
	if (err !== null && typeof err === "object" && "message" in err) {
		const msg = String(err.message);
		if (msg.length > 0) return t(msg);
	}
	if (typeof err === "string" && err.length > 0) return t(err);
	return t("validation.default");
}

export function ConnectionForm({ initial, onSave, onCancel }: ConnectionFormProps) {
	const form = useForm({
		defaultValues: {
			name: initial?.name ?? "",
			protocol: initial?.protocol ?? "sftp",
			host: initial?.host ?? "",
			port: initial?.port ?? DEFAULT_PORT.sftp,
			username: initial?.username ?? "",
			authType: initial?.authType ?? "password",
			password: initial?.password ?? "",
			privateKeyPath: initial?.privateKeyPath ?? "",
		},
		onSubmit: async ({ value }) => {
			await onSave({
				name: value.name.trim(),
				protocol: value.protocol,
				host: value.host.trim(),
				port: value.port,
				username: value.username.trim(),
				authType: value.authType,
				password: value.password,
				privateKeyPath: value.privateKeyPath.trim(),
			});
		},
		validators: {
			onSubmit: connectionFormSchema,
		},
	});

	return (
		<form
			className="flex flex-col gap-3.5"
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<form.Field name="name" validators={{ onBlur: nameSchema }}>
				{(field) => (
					<div className="flex flex-col gap-1">
						<label className={requiredLabelClass} htmlFor="conn-name">{t("connection.name")}</label>
						<input
							id="conn-name"
							className={inputClass}
							type="text"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => { field.handleChange(e.target.value); }}
							placeholder={t("connection.name")}
						/>
						{field.state.meta.errors.map((err, i) => (
							<span key={i} className={errorClass}>{errorMessage(err)}</span>
						))}
					</div>
				)}
			</form.Field>

			<div className="flex gap-3">
				<form.Field name="protocol">
					{(field) => (
						<div className="flex flex-col gap-1 flex-1">
							<label className={labelClass} htmlFor="conn-protocol">{t("connection.protocol")}</label>
							<select
								id="conn-protocol"
								className={inputClass}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => {
									const p = e.target.value;
									field.handleChange(p);
									form.setFieldValue("port", DEFAULT_PORT[p] ?? 22);
								}}
							>
								{PROTOCOLS.map((p) => (
									<option key={p} value={p}>{p.toUpperCase()}</option>
								))}
							</select>
						</div>
					)}
				</form.Field>

				<form.Field name="port" validators={{ onBlur: portSchema }}>
					{(field) => (
						<div className="flex flex-col gap-1 flex-1">
							<label className={requiredLabelClass} htmlFor="conn-port">{t("connection.port")}</label>
							<input
								id="conn-port"
								className={inputClass}
								type="number"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => {
									const val = e.target.valueAsNumber;
									if (Number.isNaN(val)) {
										field.handleChange(DEFAULT_PORT[form.state.values.protocol] ?? 22);
									} else {
										field.handleChange(val);
									}
								}}
							/>
							{field.state.meta.errors.map((err, i) => (
								<span key={i} className={errorClass}>{errorMessage(err)}</span>
							))}
						</div>
					)}
				</form.Field>
			</div>

			<form.Field name="host" validators={{ onBlur: hostSchema }}>
				{(field) => (
					<div className="flex flex-col gap-1">
						<label className={requiredLabelClass} htmlFor="conn-host">{t("connection.host")}</label>
						<input
							id="conn-host"
							className={inputClass}
							type="text"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => { field.handleChange(e.target.value); }}
							placeholder="example.com"
						/>
						{field.state.meta.errors.map((err, i) => (
							<span key={i} className={errorClass}>{errorMessage(err)}</span>
						))}
					</div>
				)}
			</form.Field>

			<form.Field name="username" validators={{ onBlur: usernameSchema }}>
				{(field) => (
					<div className="flex flex-col gap-1">
						<label className={requiredLabelClass} htmlFor="conn-username">{t("connection.username")}</label>
						<input
							id="conn-username"
							className={inputClass}
							type="text"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => { field.handleChange(e.target.value); }}
							placeholder="user"
						/>
						{field.state.meta.errors.map((err, i) => (
							<span key={i} className={errorClass}>{errorMessage(err)}</span>
						))}
					</div>
				)}
			</form.Field>

			<form.Field name="authType">
				{(field) => (
					<div className="flex flex-col gap-1">
						<label className={labelClass}>{t("connection.authType")}</label>
						<div className="flex gap-4">
							{authTypes.map((at) => (
								<label key={at} className="flex items-center gap-1 cursor-pointer text-sm [&_input]:accent-blue-600">
									<input
										type="radio"
										name="authType"
										value={at}
										checked={field.state.value === at}
										onBlur={field.handleBlur}
										onChange={() => { field.handleChange(at); }}
									/>
									{t(AUTH_LABELS[at])}
								</label>
							))}
						</div>
					</div>
				)}
			</form.Field>

			<form.Subscribe selector={(s) => s.values.authType}>
				{(authType) => (
					<>
						{authType === "password" && (
							<form.Field name="password" validators={{ onBlur: passwordSchema }}>
								{(field) => (
									<div className="flex flex-col gap-1">
										<label className={requiredLabelClass} htmlFor="conn-password">{t("connection.password")}</label>
										<input
											id="conn-password"
											className={inputClass}
											type="password"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => { field.handleChange(e.target.value); }}
										/>
										{field.state.meta.errors.map((err, i) => (
											<span key={i} className={errorClass}>{errorMessage(err)}</span>
										))}
									</div>
								)}
							</form.Field>
						)}

						{authType === "key" && (
							<form.Field name="privateKeyPath" validators={{ onBlur: privateKeyPathSchema }}>
								{(field) => (
									<div className="flex flex-col gap-1">
										<label className={requiredLabelClass} htmlFor="conn-privatekey">{t("connection.privateKey")}</label>
										<input
											id="conn-privatekey"
											className={inputClass}
											type="text"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => { field.handleChange(e.target.value); }}
											placeholder="~/.ssh/id_rsa"
										/>
										{field.state.meta.errors.map((err, i) => (
											<span key={i} className={errorClass}>{errorMessage(err)}</span>
										))}
									</div>
								)}
							</form.Field>
						)}
					</>
				)}
			</form.Subscribe>

			<div className="flex gap-2 justify-end mt-2">
				<button type="button" className="px-5 py-2 text-gray-900 border border-gray-300 rounded hover:bg-gray-300" onClick={onCancel}>
					{t("connection.cancel")}
				</button>
				<button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
					{t("connection.save")}
				</button>
			</div>
		</form>
	);
}
