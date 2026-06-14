import { Icon } from "@renderer/components/icons/Icon";
import type { IconName } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";
import type { Connection } from "@shared/types";

interface SidebarProps {
	connections: Connection[];
	selectedId: number | null;
	onSelect: (id: number) => void;
	onAdd: () => void;
	onDoubleClick?: (id: number) => void;
}

function protocolIcon(protocol: string): IconName {
	switch (protocol) {
		case "sftp":
			return "folder";
		case "scp":
			return "package";
		case "s3":
			return "cloud";
		default:
			return "globe";
	}
}

export function Sidebar({ connections, selectedId, onSelect, onAdd, onDoubleClick }: SidebarProps) {
	const { t } = useI18n();
	return (
		<div className="flex w-60 min-w-50 flex-col overflow-hidden border-r border-outline-variant bg-surface-container-low">
			<div className="shrink-0 border-b border-outline-variant px-4 py-3 text-base font-semibold text-on-surface">
				{t("connection.manager")}
			</div>
			<div className="flex-1 overflow-y-auto py-1">
				{connections.length === 0 ? (
					<div className="p-4 text-center text-xs text-muted-foreground">{t("connection.noSelection")}</div>
				) : (
					connections.map((conn) => (
						<div
							key={conn.id}
							className={
								conn.id === selectedId
									? `
										flex cursor-pointer items-center gap-2 border-l-[3px] border-l-primary bg-primary/10 px-4 py-2
										text-foreground transition-colors
									`
									: `
										flex cursor-pointer items-center gap-2 border-l-[3px] border-l-transparent px-4 py-2
										text-muted-foreground transition-colors
										hover:bg-surface-container-high hover:text-foreground
									`
							}
							onClick={() => {
								onSelect(conn.id);
							}}
							onDoubleClick={() => onDoubleClick?.(conn.id)}
						>
							<Icon name={protocolIcon(conn.protocol)} size={14} className="shrink-0 opacity-60" />
							<div>
								<div className="truncate">{conn.name}</div>
								<div className="text-xs text-muted-foreground uppercase">{conn.protocol}</div>
							</div>
						</div>
					))
				)}
			</div>
			<div className="mx-3 my-2">
				<Button className="w-full" onClick={onAdd}>
					+ {t("connection.add")}
				</Button>
			</div>
		</div>
	);
}
