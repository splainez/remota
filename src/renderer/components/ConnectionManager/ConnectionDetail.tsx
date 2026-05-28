import { useState } from "react";
import { t } from "../../../i18n";
import type { Connection, NewConnection } from "../../../shared/types";
import { Button } from "../ui/button";
import { Icon } from "../icons/Icon";
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
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	if (isNew || (connection && isEditing)) {
		return (
			<div className="flex-1 flex items-start justify-center bg-surface overflow-auto">
				<div className="w-full max-w-2xl p-6 md:p-10">
					<div className="bg-card border border-outline-variant rounded-xl overflow-hidden">
						<div className="border-b border-outline-variant bg-surface-container px-6 py-5 flex items-center gap-4">
							<div className="w-12 h-12 rounded-full bg-surface-container-highest border border-outline flex items-center justify-center text-primary shrink-0">
								<Icon name="globe" size={24} />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-card-foreground">
									{isNew ? t("connection.new") : t("connection.edit")}
								</h2>
								<p className="text-sm text-muted-foreground mt-0.5">
									{t("connection.configureDescription")}
								</p>
							</div>
						</div>
						<div className="p-6">
							<ConnectionForm
								initial={connection}
								onSave={onSave}
								onCancel={onCancel}
								onConnect={onConnect}
							/>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (connection) {
		return (
			<div className="flex-1 flex items-start justify-center bg-surface overflow-auto">
				<div className="w-full max-w-2xl p-6 md:p-10">
					<div className="bg-card border border-outline-variant rounded-xl overflow-hidden">
						{/* Header */}
						<div className="border-b border-outline-variant bg-surface-container px-6 py-5 flex items-center gap-4">
							<div className="w-12 h-12 rounded-full bg-surface-container-highest border border-outline flex items-center justify-center text-primary shrink-0">
								<Icon name="globe" size={24} />
							</div>
							<div className="flex-1 min-w-0">
								<h2 className="text-lg font-semibold text-card-foreground truncate">
									{connection.name}
								</h2>
								<p className="text-sm text-muted-foreground mt-0.5 uppercase tracking-wide">
									{connection.protocol}
								</p>
							</div>
						</div>

						{/* Body */}
						<div className="p-6 grid grid-cols-2 gap-x-6 gap-y-5">
							<div>
								<div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
									{t("connection.host")}
								</div>
								<div className="text-sm text-foreground font-medium">{connection.host}</div>
							</div>
							<div>
								<div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
									{t("connection.port")}
								</div>
								<div className="text-sm text-foreground font-medium">{connection.port}</div>
							</div>
							<div>
								<div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
									{t("connection.username")}
								</div>
								<div className="text-sm text-foreground font-medium">{connection.username || "\u2014"}</div>
							</div>
							<div>
								<div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
									{t("connection.authType")}
								</div>
								<div className="text-sm text-foreground font-medium">
									{connection.authType === "password"
										? t("connection.authPassword")
										: connection.authType === "key"
											? t("connection.authKey")
											: t("connection.authAgent")}
								</div>
							</div>
						</div>

						{/* Footer */}
						<div className="px-6 py-4 bg-surface-container border-t border-outline-variant flex items-center justify-end gap-3">
							<Button variant="secondary" onClick={onEdit}>
								<Icon name="edit" size={14} className="mr-1.5" />
								{t("connection.edit")}
							</Button>
							<Button
								variant="outline"
								className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
								onClick={() => { setShowDeleteDialog(true); }}
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
							onConfirm={() => { void Promise.resolve(onDelete(connection.id)); setShowDeleteDialog(false); }}
							onCancel={() => { setShowDeleteDialog(false); }}
						/>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 flex items-center justify-center bg-surface overflow-auto">
			<div className="text-center text-muted-foreground">
				<Icon name="plug" size={48} className="mb-3 opacity-40 mx-auto" />
				<div className="text-base">{t("connection.noSelection")}</div>
			</div>
		</div>
	);
}
