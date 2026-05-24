import { useState } from "react";
import { t } from "../../../i18n";
import type { Connection, NewConnection } from "../../../shared/types";
import { ConnectionForm } from "./ConnectionForm";
import styles from "./ConnectionDetail.module.css";

interface ConnectionDetailProps {
  connection: Connection | null;
  isNew: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onConnect: () => void;
  onSave: (data: NewConnection) => Promise<void>;
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
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isNew || (connection && isEditing)) {
    return (
      <div className={styles.detail}>
        <div className={styles.formContainer}>
          <h2 className={styles.title}>
            {isNew ? t("connection.new") : t("connection.edit")}
          </h2>
          <ConnectionForm
            initial={connection}
            onSave={onSave}
            onCancel={onCancel}
          />
        </div>
      </div>
    );
  }

  if (connection) {
    return (
      <div className={styles.detail}>
        <div className={styles.view}>
          <div className={styles.viewHeader}>
            <h2 className={styles.viewTitle}>{connection.name}</h2>
            <div className={styles.viewActions}>
              <button className={styles.btnConnect} onClick={onConnect}>
                {t("connection.connect")}
              </button>
              <button className={styles.btnEdit} onClick={onEdit}>
                {t("connection.edit")}
              </button>
              {confirmDelete ? (
                <>
                  <button
                    className={styles.btnDelete}
                    onClick={() => {
                      void onDelete(connection.id);
                      setConfirmDelete(false);
                    }}
                  >
                    {t("connection.delete")}
                  </button>
                  <button className={styles.btnEdit} onClick={() => { setConfirmDelete(false); }}>
                    {t("connection.cancel")}
                  </button>
                </>
              ) : (
                <button className={styles.btnDelete} onClick={() => { setConfirmDelete(true); }}>
                  {t("connection.delete")}
                </button>
              )}
            </div>
          </div>
          <div className={styles.viewField}>
            <div className={styles.viewLabel}>{t("connection.protocol")}</div>
            <div className={styles.viewValue}>{connection.protocol.toUpperCase()}</div>
          </div>
          <div className={styles.viewField}>
            <div className={styles.viewLabel}>{t("connection.host")}</div>
            <div className={styles.viewValue}>{connection.host}</div>
          </div>
          <div className={styles.viewField}>
            <div className={styles.viewLabel}>{t("connection.port")}</div>
            <div className={styles.viewValue}>{connection.port}</div>
          </div>
          <div className={styles.viewField}>
            <div className={styles.viewLabel}>{t("connection.username")}</div>
            <div className={styles.viewValue}>{connection.username || "—"}</div>
          </div>
          <div className={styles.viewField}>
            <div className={styles.viewLabel}>{t("connection.authType")}</div>
            <div className={styles.viewValue}>
              {connection.authType === "password"
                ? t("connection.authPassword")
                : connection.authType === "key"
                  ? t("connection.authKey")
                  : t("connection.authAgent")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.detail}>
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>&#128268;</div>
        <div className={styles.emptyText}>{t("connection.noSelection")}</div>
      </div>
    </div>
  );
}
