import { t } from "../../../i18n";
import type { Connection } from "../../../shared/types";
import styles from "./Sidebar.module.css";

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
    <div className={styles.sidebar}>
      <div className={styles.header}>{t("connection.manager")}</div>
      <div className={styles.list}>
        {connections.length === 0 ? (
          <div className={styles.empty}>{t("connection.noSelection")}</div>
        ) : (
          connections.map((conn) => (
            <div
              key={conn.id}
              className={conn.id === selectedId ? styles.itemActive : styles.item}
              onClick={() => { onSelect(conn.id); }}
              onDoubleClick={() => onDoubleClick?.(conn.id)}
            >
              <span className={styles.itemIcon}>{protocolIcon(conn.protocol)}</span>
              <div>
                <div className={styles.itemName}>{conn.name}</div>
                <div className={styles.itemProtocol}>{conn.protocol}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <button className={styles.addButton} onClick={onAdd}>
        + {t("connection.add")}
      </button>
    </div>
  );
}
