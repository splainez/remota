import { useState } from "react";
import { t } from "../../../i18n";
import type { Connection, NewConnection } from "../../../shared/types";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Icon } from "../icons/Icon";
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
      <div className="flex-1 flex items-start justify-center bg-surface overflow-auto">
        <div className="w-full max-w-2xl p-6 md:p-10">
          <Card className="shadow-sm">
            <CardHeader className="border-b border-outline-variant bg-surface-container flex-row items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-outline flex items-center justify-center text-primary">
                <Icon name="globe" size={24} />
              </div>
              <div>
                <CardTitle>{isNew ? t("connection.new") : t("connection.edit")}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("connection.configureDescription")}
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ConnectionForm
                initial={connection}
                onSave={onSave}
                onCancel={onCancel}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (connection) {
    return (
      <div className="flex-1 flex items-start justify-center bg-surface overflow-auto">
        <div className="w-full max-w-2xl p-6 md:p-10">
          <Card className="shadow-sm">
            <CardHeader className="border-b border-outline-variant bg-surface-container flex-row items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-outline flex items-center justify-center text-primary">
                <Icon name="globe" size={24} />
              </div>
              <div className="flex-1">
                <CardTitle>{connection.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{connection.protocol.toUpperCase()}</p>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">{t("connection.host")}</div>
                <div className="text-sm text-foreground">{connection.host}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">{t("connection.port")}</div>
                <div className="text-sm text-foreground">{connection.port}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">{t("connection.username")}</div>
                <div className="text-sm text-foreground">{connection.username || "\u2014"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">{t("connection.authType")}</div>
                <div className="text-sm text-foreground">
                  {connection.authType === "password"
                    ? t("connection.authPassword")
                    : connection.authType === "key"
                      ? t("connection.authKey")
                      : t("connection.authAgent")}
                </div>
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button variant="default" onClick={onConnect}>
                {t("connection.connect")}
              </Button>
              <Button variant="secondary" onClick={onEdit}>
                {t("connection.edit")}
              </Button>
              {confirmDelete ? (
                <>
                  <Button variant="destructive" onClick={() => { void onDelete(connection.id); setConfirmDelete(false); }}>
                    {t("connection.delete")}
                  </Button>
                  <Button variant="outline" onClick={() => { setConfirmDelete(false); }}>
                    {t("connection.cancel")}
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => { setConfirmDelete(true); }}>
                  {t("connection.delete")}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-surface overflow-auto">
      <div className="text-center text-muted-foreground">
        <Icon name="plug" size={48} className="mb-3 opacity-40" />
        <div className="text-base">{t("connection.noSelection")}</div>
      </div>
    </div>
  );
}
