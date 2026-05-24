import { useState } from "react";
import { t } from "../../../i18n";
import type { Connection, NewConnection } from "../../../shared/types";
import styles from "./ConnectionForm.module.css";

interface ConnectionFormProps {
  initial: Connection | null;
  onSave: (data: NewConnection) => Promise<void>;
  onCancel: () => void;
}

const PROTOCOLS = ["sftp", "scp", "s3"];
const DEFAULT_PORT: Record<string, number> = { sftp: 22, scp: 22, s3: 443 };

export function ConnectionForm({ initial, onSave, onCancel }: ConnectionFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [protocol, setProtocol] = useState(initial?.protocol ?? "sftp");
  const [host, setHost] = useState(initial?.host ?? "");
  const [port, setPort] = useState(String(initial?.port ?? DEFAULT_PORT.sftp));
  const [username, setUsername] = useState(initial?.username ?? "");
  const [authType, setAuthType] = useState<Connection["authType"]>(initial?.authType ?? "password");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [privateKeyPath, setPrivateKeyPath] = useState(initial?.privateKeyPath ?? "");

  const handleProtocolChange = (p: string) => {
    setProtocol(p);
    setPort(String(DEFAULT_PORT[p] ?? 22));
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    void onSave({
      name: name.trim() || host,
      protocol,
      host: host.trim(),
      port: Number(port) || DEFAULT_PORT[protocol],
      username,
      authType,
      password,
      privateKeyPath,
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="conn-name">{t("connection.name")}</label>
        <input
          id="conn-name"
          className={styles.input}
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); }}
          placeholder={t("connection.name")}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="conn-protocol">{t("connection.protocol")}</label>
          <select
            id="conn-protocol"
            className={styles.select}
            value={protocol}
            onChange={(e) => { handleProtocolChange(e.target.value); }}
          >
            {PROTOCOLS.map((p) => (
              <option key={p} value={p}>{p.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="conn-port">{t("connection.port")}</label>
          <input
            id="conn-port"
            className={styles.input}
            type="number"
            value={port}
            onChange={(e) => { setPort(e.target.value); }}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="conn-host">{t("connection.host")}</label>
        <input
          id="conn-host"
          className={styles.input}
          type="text"
          value={host}
          onChange={(e) => { setHost(e.target.value); }}
          placeholder="example.com"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="conn-username">{t("connection.username")}</label>
        <input
          id="conn-username"
          className={styles.input}
          type="text"
          value={username}
          onChange={(e) => { setUsername(e.target.value); }}
          placeholder="user"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t("connection.authType")}</label>
        <div className={styles.authGroup}>
          <label className={styles.radio}>
            <input
              type="radio"
              name="authType"
              value="password"
              checked={authType === "password"}
              onChange={() => { setAuthType("password"); }}
            />
            {t("connection.authPassword")}
          </label>
          <label className={styles.radio}>
            <input
              type="radio"
              name="authType"
              value="key"
              checked={authType === "key"}
              onChange={() => { setAuthType("key"); }}
            />
            {t("connection.authKey")}
          </label>
          <label className={styles.radio}>
            <input
              type="radio"
              name="authType"
              value="agent"
              checked={authType === "agent"}
              onChange={() => { setAuthType("agent"); }}
            />
            {t("connection.authAgent")}
          </label>
        </div>
      </div>

      {authType === "password" && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="conn-password">{t("connection.password")}</label>
          <input
            id="conn-password"
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); }}
          />
        </div>
      )}

      {authType === "key" && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="conn-privatekey">{t("connection.privateKey")}</label>
          <input
            id="conn-privatekey"
            className={styles.input}
            type="text"
            value={privateKeyPath}
            onChange={(e) => { setPrivateKeyPath(e.target.value); }}
            placeholder="~/.ssh/id_rsa"
          />
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.btnSecondary} onClick={onCancel}>
          {t("connection.cancel")}
        </button>
        <button type="submit" className={styles.btnPrimary}>
          {t("connection.save")}
        </button>
      </div>
    </form>
  );
}
