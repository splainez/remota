import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import { t, type TranslationKey } from "../../../i18n";
import type { Connection, NewConnection } from "../../../shared/types";
import { connectionFormSchema, nameSchema, DEFAULT_PORT, type ConnectionFormData } from "../../../shared/validation";
import { SftpFields } from "./SftpFields";
import { S3Fields } from "./S3Fields";
import { AdvancedSettings } from "./AdvancedSettings";
import { FormFooter } from "./FormFooter";
import { Icon } from "../icons/Icon";

interface ConnectionFormProps {
	initial: Connection | null;
	onSave: (data: NewConnection) => Promise<Connection | undefined>;
	onCancel: () => void;
	onConnect?: (connection: Connection) => void;
}

const inputClass =
	"px-3 py-[7px] border border-input rounded-lg bg-background text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 w-full";

export function ConnectionForm({ initial, onSave, onCancel, onConnect }: ConnectionFormProps) {
	const [showAdvanced, setShowAdvanced] = useState(false);
	const savedRef = useRef<{ connection?: Connection }>({});

	function getFormData(values: ConnectionFormData): NewConnection {
		return {
			name: values.name.trim(),
			protocol: values.protocol,
			host: values.host.trim(),
			port: values.port,
			username: values.username.trim(),
			authType: values.authType,
			password: values.password,
			privateKeyPath: values.privateKeyPath.trim(),
			accessKey: values.accessKey.trim(),
			secretKey: values.secretKey.trim(),
			region: values.region.trim(),
			bucket: values.bucket.trim(),
			endpoint: values.endpoint.trim(),
			useHttps: values.useHttps,
			groupName: values.groupName.trim(),
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
			savedRef.current.connection = await onSave(getFormData(value as ConnectionFormData));
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
			<div className="flex items-center gap-3 mb-1">
				<button
					type="button"
					aria-label={t("connection.back")}
					className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-container-high transition-colors"
					onClick={onCancel}
				>
					<Icon name="arrow-left" size={18} />
				</button>
				<h2 className="text-lg font-semibold text-foreground">
					{initial ? t("connection.edit") : t("connection.new")}
				</h2>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<form.Field name="name" validators={{ onBlur: nameSchema }}>
					{(field) => (
						<div className="flex flex-col gap-1">
							<label
								className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground after:content-['_*'] after:text-destructive after:ml-0.5"
								htmlFor="conn-name"
							>
								{t("connection.name")}
							</label>
							<input
								id="conn-name"
								className={inputClass}
								type="text"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => {
									field.handleChange(e.target.value);
								}}
								placeholder={t("connection.namePlaceholder")}
							/>
							{field.state.meta.errors.map((err: unknown, i: number) => {
								const msg =
									err !== null && typeof err === "object" && "message" in err ? String(err.message) : String(err);
								return (
									<span key={i} className="text-xs text-destructive mt-0.5">
										{t(msg as TranslationKey)}
									</span>
								);
							})}
						</div>
					)}
				</form.Field>

				<form.Field name="protocol">
					{(field) => (
						<div className="flex flex-col gap-1">
							<label
								className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								htmlFor="conn-protocol"
							>
								{t("connection.protocol")}
							</label>
							<select
								id="conn-protocol"
								className={inputClass}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => {
									const val = e.target.value;
									if (val === "sftp" || val === "scp" || val === "s3") {
										field.handleChange(val);
										form.setFieldValue("port", DEFAULT_PORT[val]);
									}
								}}
							>
								{(["sftp", "scp", "s3"] as const).map((p) => (
									<option key={p} value={p}>
										{p.toUpperCase()}
									</option>
								))}
							</select>
						</div>
					)}
				</form.Field>
			</div>

			<form.Subscribe selector={(s) => s.values.protocol}>
				{(protocol) => (
					<>
						{protocol !== "s3" && <SftpFields form={form} />}
						{protocol === "s3" && <S3Fields form={form} />}
					</>
				)}
			</form.Subscribe>

			<AdvancedSettings
				form={form}
				visible={showAdvanced}
				onToggle={() => {
					setShowAdvanced((v) => !v);
				}}
			/>

			<FormFooter
				onCancel={onCancel}
				onSave={() => {
					void handleSubmit(false);
				}}
				onConnect={() => {
					void handleSubmit(true);
				}}
			/>
		</form>
	);
}
