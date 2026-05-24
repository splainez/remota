import { t } from "../../../i18n";
import type { Connection } from "../../../shared/types";

interface SidebarProps {
  connections: Connection[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAdd: () => void;
  onDoubleClick?: (id: number) => void;
}

function protocolIcon(protocol: string): string {
  switch (protocol) {
    case "sftp": return "\u{1F4C1}";
    case "scp": return "\u{1F4E6}";
    case "s3": return "\u2601\uFE0F";
    default: return "\u{1F310}";
  }
}

export function Sidebar({ connections, selectedId, onSelect, onAdd, onDoubleClick }: SidebarProps) {
  return (
    <div className="w-60 min-w-[200px] bg-gray-200 border-r border-gray-300 flex flex-col overflow-hidden">
      <div className="px-4 py-3 text-base font-semibold text-gray-900 border-b border-gray-300 shrink-0">{t("connection.manager")}</div>
      <div className="flex-1 overflow-y-auto py-1">
        {connections.length === 0 ? (
          <div className="p-4 text-gray-500 text-xs text-center">{t("connection.noSelection")}</div>
        ) : (
          connections.map((conn) => (
            <div
              key={conn.id}
              className={conn.id === selectedId
                ? "px-4 py-2 cursor-pointer flex items-center gap-2 border-l-[3px] border-l-blue-600 bg-blue-100 transition-colors"
                : "px-4 py-2 cursor-pointer flex items-center gap-2 border-l-[3px] border-l-transparent transition-colors hover:bg-gray-300"
              }
              onClick={() => { onSelect(conn.id); }}
              onDoubleClick={() => onDoubleClick?.(conn.id)}
            >
              <span className="text-sm opacity-60 shrink-0">{protocolIcon(conn.protocol)}</span>
              <div>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap">{conn.name}</div>
                <div className="text-xs text-gray-500 uppercase">{conn.protocol}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <button className="mx-3 my-2 px-3 py-[7px] bg-blue-600 text-white rounded font-medium shrink-0 hover:bg-blue-700" onClick={onAdd}>
        + {t("connection.add")}
      </button>
    </div>
  );
}
