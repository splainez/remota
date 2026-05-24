import { useState } from "react";
import { useConnections } from "../../hooks/useConnections";
import { Sidebar } from "./Sidebar";
import { ConnectionDetail } from "./ConnectionDetail";
import styles from "./ConnectionManager.module.css";

export function ConnectionManager() {
  const {
    connections,
    selected,
    loading,
    select,
    create,
    update,
    remove,
  } = useConnections();

  const [isNew, setIsNew] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleSelect = (id: number) => {
    setIsNew(false);
    setIsEditing(false);
    select(id);
  };

  const handleAdd = () => {
    select(null);
    setIsNew(true);
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (isNew) {
      setIsNew(false);
      setIsEditing(false);
      if (connections.length > 0) {
        select(connections[0].id);
      }
    } else {
      setIsEditing(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className={styles.manager}>
      <Sidebar
        connections={connections}
        selectedId={selected?.id ?? null}
        onSelect={handleSelect}
        onAdd={handleAdd}
      />
      <ConnectionDetail
        connection={selected}
        isNew={isNew}
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onCancel={handleCancel}
        onSave={async (data) => {
          if (isNew) {
            await create(data);
            setIsNew(false);
            setIsEditing(false);
          } else if (selected) {
            await update({ ...data, id: selected.id });
            setIsEditing(false);
          }
        }}
        onDelete={async (id) => {
          await remove(id);
        }}
      />
    </div>
  );
}
