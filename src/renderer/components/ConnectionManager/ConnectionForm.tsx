import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
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
	accessKeySchema,
	secretKeySchema,
	regionSchema,
	bucketSchema,
	authTypes,
	DEFAULT_PORT,
} from "../../../shared/validation";
import { Button } from "../ui/button";
import { Icon } from "../icons/Icon";

interface ConnectionFormProps {
	initial: Connection | null;
	onSave: (data: NewConnection) => Promise<Connection | undefined>;
	onCancel: () => void;
	onConnect?: (connection: Connection) => void;
}

const PROTOCOLS = ["sftp", "scp", "s3"] as const;
const AUTH_LABELS: Record<string, string> = {
	password: "connection.authPassword",
	key: "connection.authKey",
	agent: "connection.authAgent",
};

const inputClass = "px-3 py-[7px] border border-input rounded-lg bg-background text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 w-full";
const labelClass = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
const errorClass = "text-xs text-destructive mt-0.5";
const requiredLabelClass = `${labelClass} after:content-['_*'] after:text-destructive after:ml-0.5`;

function errorMessage(err: unknown): string {
	if (err !== null && typeof err === "object" && "message" in err) {
		const msg = String(err.message);
		if (msg.length > 0) return t(msg);
	}
	if (typeof err === "string" && err.length > 0) return t(err);
	return t("validation.default");
}

export function ConnectionForm({ initial, onSave, onCancel, onConnect }: ConnectionFormProps) {
	const [showAdvanced, setShowAdvanced] = useState(false);
	const savedRef = useRef<{ connection?: Connection }>({});

	function getFormData(value: typeof form.state.values): NewConnection {
		return {
			name: value.name.trim(),
			protocol: value.protocol,
			host: value.host.trim(),
			port: value.port,
			username: value.username.trim(),
			authType: value.authType,
			password: value.password,
			privateKeyPath: value.privateKeyPath.trim(),
			accessKey: value.accessKey.trim(),
			secretKey: value.secretKey.trim(),
			region: value.region.trim(),
			bucket: value.bucket.trim(),
			endpoint: value.endpoint.trim(),
			useHttps: value.useHttps,
			groupName: value.groupName.trim(),
		};
	}

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
			accessKey: initial?.accessKey ?? "",
			secretKey: initial?.secretKey ?? "",
			region: initial?.region ?? "us-east-1",
			bucket: initial?.bucket ?? "",
			endpoint: initial?.endpoint ?? "",
			useHttps: initial?.useHttps ?? true,
			groupName: initial?.groupName ?? "",
		},
		onSubmit: async ({ value }) => {
			savedRef.current.connection = await onSave(getFormData(value));
		},
		validators: {
			onSubmit: connectionFormSchema,
		},
	});

	const handleSubmit = async (shouldConnect: boolean) => {
		savedRef.current = {};
		await form.handleSubmit();
		const conn = savedRef.current.connection;
		if (shouldConnect && onConnect && conn) {
			onConnect(conn);
		}
	};

	return (
		<form
			className="flex flex-col gap-5"
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void handleSubmit(false);
			}}
		>
			{/* Row 1: Name + Protocol */}
			<div className="grid grid-cols-2 gap-4">
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
								placeholder={t("connection.namePlaceholder")}
							/>
							{field.state.meta.errors.map((err, i) => (
								<span key={i} className={errorClass}>{errorMessage(err)}</span>
							))}
						</div>
					)}
				</form.Field>

				<form.Field name="protocol">
					{(field) => (
						<div className="flex flex-col gap-1">
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
			</div>

			{/* Row 2: Host + Port */}
			<div className="grid grid-cols-[1fr_auto] gap-4">
				<form.Field name="host" validators={{ onBlur: hostSchema }}>
					{(field) => (
						<div className="flex flex-col gap-1">
							<label className={requiredLabelClass} htmlFor="conn-host">{t("connection.host")}</label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
									<Icon name="server" size={14} />
								</span>
								<input
									id="conn-host"
									className={`${inputClass} pl-8`}
									type="text"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => { field.handleChange(e.target.value); }}
									placeholder="ftp.example.com"
								/>
							</div>
							{field.state.meta.errors.map((err, i) => (
								<span key={i} className={errorClass}>{errorMessage(err)}</span>
							))}
						</div>
					)}
				</form.Field>

				<form.Field name="port" validators={{ onBlur: portSchema }}>
					{(field) => (
						<div className="flex flex-col gap-1 w-24">
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

			<form.Subscribe selector={(s) => s.values.protocol}>
				{(protocol) => (
					<>
						{protocol !== "s3" && (
							<>
								{/* Row 3: Username + Password/Key */}
								<div className="grid grid-cols-2 gap-4">
									<form.Field name="username" validators={{ onBlur: usernameSchema }}>
										{(field) => (
											<div className="flex flex-col gap-1">
												<label className={requiredLabelClass} htmlFor="conn-username">{t("connection.username")}</label>
												<div className="relative">
													<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
														<Icon name="person" size={14} />
													</span>
													<input
														id="conn-username"
														className={`${inputClass} pl-8`}
														type="text"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => { field.handleChange(e.target.value); }}
														placeholder="root"
													/>
												</div>
												{field.state.meta.errors.map((err, i) => (
													<span key={i} className={errorClass}>{errorMessage(err)}</span>
												))}
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
											{authType === "agent" && (
												<div className="flex flex-col gap-1">
													<label className={labelClass}>{t("connection.password")}</label>
													<div className={`${inputClass} text-muted-foreground text-sm flex items-center gap-2`}>
														<Icon name="shield" size={14} />
														{t("connection.authAgent")}
													</div>
												</div>
											)}
										</>
									)}
								</form.Subscribe>
								</div>

								{/* Auth type selector */}
								<form.Field name="authType">
									{(field) => (
										<div className="flex flex-col gap-2">
											<label className={labelClass}>{t("connection.authType")}</label>
											<div className="flex gap-4">
												{authTypes.map((at) => (
													<label key={at} className="flex items-center gap-1.5 cursor-pointer text-sm text-foreground [&_input]:accent-primary">
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
							</>
						)}

						{protocol === "s3" && (
							<div className="grid grid-cols-2 gap-4">
								<form.Field name="accessKey" validators={{ onBlur: accessKeySchema }}>
									{(field) => (
										<div className="flex flex-col gap-1">
											<label className={requiredLabelClass} htmlFor="conn-accesskey">{t("connection.accessKey")}</label>
											<input
												id="conn-accesskey"
												className={inputClass}
												type="text"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => { field.handleChange(e.target.value); }}
												placeholder="AKIAIOSFODNN7EXAMPLE"
											/>
											{field.state.meta.errors.map((err, i) => (
												<span key={i} className={errorClass}>{errorMessage(err)}</span>
											))}
										</div>
									)}
								</form.Field>

								<form.Field name="secretKey" validators={{ onBlur: secretKeySchema }}>
									{(field) => (
										<div className="flex flex-col gap-1">
											<label className={requiredLabelClass} htmlFor="conn-secretkey">{t("connection.secretKey")}</label>
											<input
												id="conn-secretkey"
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

								<form.Field name="region" validators={{ onBlur: regionSchema }}>
									{(field) => (
										<div className="flex flex-col gap-1">
											<label className={requiredLabelClass} htmlFor="conn-region">{t("connection.region")}</label>
											<input
												id="conn-region"
												className={inputClass}
												type="text"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => { field.handleChange(e.target.value); }}
												placeholder="us-east-1"
											/>
											{field.state.meta.errors.map((err, i) => (
												<span key={i} className={errorClass}>{errorMessage(err)}</span>
											))}
										</div>
									)}
								</form.Field>

								<form.Field name="bucket" validators={{ onBlur: bucketSchema }}>
									{(field) => (
										<div className="flex flex-col gap-1">
											<label className={requiredLabelClass} htmlFor="conn-bucket">{t("connection.bucket")}</label>
											<input
												id="conn-bucket"
												className={inputClass}
												type="text"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => { field.handleChange(e.target.value); }}
												placeholder="my-bucket"
											/>
											{field.state.meta.errors.map((err, i) => (
												<span key={i} className={errorClass}>{errorMessage(err)}</span>
											))}
										</div>
									)}
								</form.Field>

								<form.Field name="endpoint">
									{(field) => (
										<div className="flex flex-col gap-1">
											<label className={labelClass} htmlFor="conn-endpoint">{t("connection.endpoint")}</label>
											<input
												id="conn-endpoint"
												className={inputClass}
												type="text"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => { field.handleChange(e.target.value); }}
												placeholder="s3.amazonaws.com"
											/>
										</div>
									)}
								</form.Field>

								<form.Field name="useHttps">
									{(field) => (
										<div className="flex items-center gap-2">
											<input
												id="conn-usehttps"
												type="checkbox"
												className="accent-primary"
												checked={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => { field.handleChange(e.target.checked); }}
											/>
											<label className="text-sm text-foreground cursor-pointer select-none" htmlFor="conn-usehttps">
												{t("connection.useHttps")}
											</label>
										</div>
									)}
								</form.Field>
							</div>
						)}
					</>
				)}
			</form.Subscribe>

			{/* Advanced Settings */}
			<div className="border-t border-outline-variant pt-4">
				<button
					type="button"
					className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-foreground transition-colors"
					onClick={() => { setShowAdvanced((v) => !v); }}
				>
					<Icon name={showAdvanced ? "arrow-up" : "arrow-down"} size={14} />
					{t("connection.advancedSettings")}
				</button>
				{showAdvanced && (
					<div className="mt-3 grid grid-cols-2 gap-4">
						<form.Field name="groupName">
							{(field) => (
								<div className="flex flex-col gap-1">
									<label className={labelClass} htmlFor="conn-group">{t("connection.group")}</label>
									<input
										id="conn-group"
										className={inputClass}
										type="text"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => { field.handleChange(e.target.value); }}
										placeholder={t("connection.groupPlaceholder")}
									/>
								</div>
							)}
						</form.Field>
					</div>
				)}
			</div>

			{/* Footer Buttons */}
			<div className="flex items-center justify-end gap-2 pt-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					{t("connection.cancel")}
				</Button>
				<Button
					type="button"
					variant="secondary"
					onClick={() => { void handleSubmit(false); }}
				>
					<Icon name="save" size={14} className="mr-1.5" />
					{t("connection.saveConnection")}
				</Button>
				<Button
					type="button"
					variant="default"
					onClick={() => { void handleSubmit(true); }}
				>
					<Icon name="plug" size={14} className="mr-1.5" />
					{t("connection.connect")}
				</Button>
			</div>
		</form>
	);
}
