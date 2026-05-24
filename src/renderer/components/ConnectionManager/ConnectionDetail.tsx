import { useState } from "react";
import { t } from "../../../i18n";
import type { Connection, NewConnection } from "../../../shared/types";
import { ConnectionForm } from "./ConnectionForm";

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
      <div className="flex-1 flex items-center justify-center bg-white overflow-auto">
        <div className="w-full max-w-[520px] p-8">
          <h2 className="text-lg font-semibold mb-6">
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
      <div className="flex-1 flex items-center justify-center bg-white overflow-auto">
        <div className="w-full max-w-[520px] p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">{connection.name}</h2>
            <div className="flex gap-2">
              <button className="px-4 py-1.5 bg-green-700 text-white rounded font-medium hover:bg-green-800" onClick={onConnect}>
                {t("connection.connect")}
              </button>
              <button className="px-4 py-1.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700" onClick={onEdit}>
                {t("connection.edit")}
              </button>
              {confirmDelete ? (
                <>
                  <button
                    className="px-4 py-1.5 text-red-600 border border-red-600 rounded hover:bg-red-600 hover:text-white"
                    onClick={() => {
                      void onDelete(connection.id);
                      setConfirmDelete(false);
                    }}
                  >
                    {t("connection.delete")}
                  </button>
                  <button className="px-4 py-1.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700" onClick={() => { setConfirmDelete(false); }}>
                    {t("connection.cancel")}
                  </button>
                </>
              ) : (
                <button className="px-4 py-1.5 text-red-600 border border-red-600 rounded hover:bg-red-600 hover:text-white" onClick={() => { setConfirmDelete(true); }}>
                  {t("connection.delete")}
                </button>
              )}
            </div>
          </div>
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-0.5">{t("connection.protocol")}</div>
            <div className="text-sm">{connection.protocol.toUpperCase()}</div>
          </div>
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-0.5">{t("connection.host")}</div>
            <div className="text-sm">{connection.host}</div>
          </div>
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-0.5">{t("connection.port")}</div>
            <div className="text-sm">{connection.port}</div>
          </div>
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-0.5">{t("connection.username")}</div>
            <div className="text-sm">{connection.username || "\u2014"}</div>
          </div>
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-0.5">{t("connection.authType")}</div>
            <div className="text-sm">
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
    <div className="flex-1 flex items-center justify-center bg-white overflow-auto">
      <div className="text-center text-gray-500">
        <div className="text-5xl mb-3 opacity-40">&#128268;</div>
        <div className="text-base">{t("connection.noSelection")}</div>
      </div>
    </div>
  );
}
