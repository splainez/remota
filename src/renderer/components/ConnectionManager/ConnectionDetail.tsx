import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";
import type { Connection, NewConnection } from "@shared/types";
import { useState } from "react";

import { ConnectionForm } from "./ConnectionForm";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

interface ConnectionDetailProps {
	connection: Connection | null;
	isNew: boolean;
	isEditing: boolean;
	onEdit: () => void;
	onCancel: () => void;
	onConnect: () => void;
	onSave: (data: NewConnection) => Promise<Connection | undefined>;
	onDelete: (id: number) => Promise<void>;
}

export function ConnectionDetail({
	connection,
	isNew,
	isEditing,
	onEdit,
	onCancel,
	onConnect,
	onSave,
	onDelete,
}: ConnectionDetailProps) {
	const { t } = useI18n();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	if (isNew || (connection && isEditing)) {
		return (
			<div className="flex flex-1 items-start justify-center overflow-auto bg-surface">
				<div className="w-full max-w-2xl p-6 md:p-10">
					<ConnectionForm initial={connection} onSave={onSave} onCancel={onCancel} onConnect={onConnect} />
				</div>
			</div>
		);
	}

	if (connection) {
		return (
			<div className="flex flex-1 items-start justify-center overflow-auto bg-surface">
				<div className="w-full max-w-2xl p-6 md:p-10">
					<div className="mb-6 flex items-center gap-3">
						<Button variant="ghost" size="icon" aria-label={t("connection.back")} onClick={onCancel}>
							<Icon name="arrow-left" size={18} />
						</Button>
						<h2 className="truncate text-lg font-semibold text-foreground">{connection.name}</h2>
					</div>

					<div className="flex flex-col gap-8">
						<section className="flex flex-col gap-3">
							<h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
								{t("connection.details")}
							</h3>
							<div
								className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-xl border border-outline-variant bg-surface-container p-4"
							>
								<div>
									<div className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
										{t("connection.name")}
									</div>
									<div className="truncate text-sm font-medium text-foreground">{connection.name}</div>
								</div>
								<div>
									<div className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
										{t("connection.protocol")}
									</div>
									<div className="text-sm font-medium text-foreground uppercase">{connection.protocol}</div>
								</div>
								<div>
									<div className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
										{t("connection.host")}
									</div>
									<div className="text-sm font-medium text-foreground">{connection.host}</div>
								</div>
								<div>
									<div className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
										{t("connection.port")}
									</div>
									<div className="text-sm font-medium text-foreground">{connection.port}</div>
								</div>
								<div>
									<div className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
										{t("connection.username")}
									</div>
									<div className="text-sm font-medium text-foreground">{connection.username || "\u2014"}</div>
								</div>
								<div>
									<div className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
										{t("connection.authType")}
									</div>
									<div className="text-sm font-medium text-foreground">
										{connection.authType === "password"
											? t("connection.authPassword")
											: connection.authType === "key"
												? t("connection.authKey")
												: t("connection.authAgent")}
									</div>
								</div>
							</div>
						</section>

						<div className="flex items-center justify-end gap-2 pt-2">
							<Button variant="secondary" onClick={onEdit}>
								<Icon name="edit" size={14} className="mr-1.5" />
								{t("connection.edit")}
							</Button>
							<Button
								variant="outline"
								className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
								onClick={() => {
									setShowDeleteDialog(true);
								}}
							>
								<Icon name="trash" size={14} className="mr-1.5" />
								{t("connection.delete")}
							</Button>
							<Button variant="default" onClick={onConnect}>
								<Icon name="plug" size={14} className="mr-1.5" />
								{t("connection.connect")}
							</Button>
						</div>
					</div>

					{showDeleteDialog && (
						<DeleteConfirmDialog
							title={t("connection.confirmDelete")}
							description={connection.name}
							onConfirm={() => {
								void Promise.resolve(onDelete(connection.id));
								setShowDeleteDialog(false);
							}}
							onCancel={() => {
								setShowDeleteDialog(false);
							}}
						/>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-1 items-center justify-center overflow-auto bg-surface">
			<div className="text-center text-muted-foreground">
				<Icon name="plug" size={48} className="mx-auto mb-3 opacity-40" />
				<div className="text-base">{t("connection.noSelection")}</div>
			</div>
		</div>
	);
}
