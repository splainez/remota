import { t } from "../../../i18n";
import type { FormApi } from "@tanstack/react-form";
import { FormField } from "./FormField";
import { accessKeySchema, secretKeySchema, regionSchema, bucketSchema } from "../../../shared/validation";

const inputClass = "px-3 py-[7px] border border-input rounded-lg bg-background text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 w-full";

interface S3FieldsProps {
	form: FormApi<Record<string, unknown>, undefined>;
}

export function S3Fields({ form }: S3FieldsProps) {
	return (
		<div className="grid grid-cols-2 gap-4">
			<form.Field name="accessKey" validators={{ onBlur: accessKeySchema }}>
				{(field) => (
					<FormField label={t("connection.accessKey")} required htmlFor="conn-accesskey" errors={field.state.meta.errors}>
						<input
							id="conn-accesskey"
							className={inputClass}
							type="text"
							value={String(field.state.value)}
							onBlur={field.handleBlur}
							onChange={(e) => { field.handleChange(e.target.value); }}
							placeholder="AKIAIOSFODNN7EXAMPLE"
						/>
					</FormField>
				)}
			</form.Field>

			<form.Field name="secretKey" validators={{ onBlur: secretKeySchema }}>
				{(field) => (
					<FormField label={t("connection.secretKey")} required htmlFor="conn-secretkey" errors={field.state.meta.errors}>
						<input
							id="conn-secretkey"
							className={inputClass}
							type="password"
							value={String(field.state.value)}
							onBlur={field.handleBlur}
							onChange={(e) => { field.handleChange(e.target.value); }}
						/>
					</FormField>
				)}
			</form.Field>

			<form.Field name="region" validators={{ onBlur: regionSchema }}>
				{(field) => (
					<FormField label={t("connection.region")} required htmlFor="conn-region" errors={field.state.meta.errors}>
						<input
							id="conn-region"
							className={inputClass}
							type="text"
							value={String(field.state.value)}
							onBlur={field.handleBlur}
							onChange={(e) => { field.handleChange(e.target.value); }}
							placeholder="us-east-1"
						/>
					</FormField>
				)}
			</form.Field>

			<form.Field name="bucket" validators={{ onBlur: bucketSchema }}>
				{(field) => (
					<FormField label={t("connection.bucket")} required htmlFor="conn-bucket" errors={field.state.meta.errors}>
						<input
							id="conn-bucket"
							className={inputClass}
							type="text"
							value={String(field.state.value)}
							onBlur={field.handleBlur}
							onChange={(e) => { field.handleChange(e.target.value); }}
							placeholder="my-bucket"
						/>
					</FormField>
				)}
			</form.Field>

			<form.Field name="endpoint">
				{(field) => (
					<FormField label={t("connection.endpoint")} htmlFor="conn-endpoint">
						<input
							id="conn-endpoint"
							className={inputClass}
							type="text"
							value={String(field.state.value)}
							onBlur={field.handleBlur}
							onChange={(e) => { field.handleChange(e.target.value); }}
							placeholder="s3.amazonaws.com"
						/>
					</FormField>
				)}
			</form.Field>

			<form.Field name="useHttps">
				{(field) => (
					<div className="flex items-center gap-2">
						<input
							id="conn-usehttps"
							type="checkbox"
							className="accent-primary"
							checked={Boolean(field.state.value)}
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
	);
}
