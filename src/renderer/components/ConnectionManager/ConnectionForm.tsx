import { useState } from "react";
import { t } from "../../../i18n";
import type { Connection, NewConnection } from "../../../shared/types";

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
    <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500" htmlFor="conn-name">{t("connection.name")}</label>
        <input
          id="conn-name"
          className="px-2.5 py-[7px] border border-gray-400 rounded bg-white text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); }}
          placeholder={t("connection.name")}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-medium text-gray-500" htmlFor="conn-protocol">{t("connection.protocol")}</label>
          <select
            id="conn-protocol"
            className="px-2.5 py-[7px] border border-gray-400 rounded bg-white text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={protocol}
            onChange={(e) => { handleProtocolChange(e.target.value); }}
          >
            {PROTOCOLS.map((p) => (
              <option key={p} value={p}>{p.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-medium text-gray-500" htmlFor="conn-port">{t("connection.port")}</label>
          <input
            id="conn-port"
            className="px-2.5 py-[7px] border border-gray-400 rounded bg-white text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            type="number"
            value={port}
            onChange={(e) => { setPort(e.target.value); }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500" htmlFor="conn-host">{t("connection.host")}</label>
        <input
          id="conn-host"
          className="px-2.5 py-[7px] border border-gray-400 rounded bg-white text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          type="text"
          value={host}
          onChange={(e) => { setHost(e.target.value); }}
          placeholder="example.com"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500" htmlFor="conn-username">{t("connection.username")}</label>
        <input
          id="conn-username"
          className="px-2.5 py-[7px] border border-gray-400 rounded bg-white text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          type="text"
          value={username}
          onChange={(e) => { setUsername(e.target.value); }}
          placeholder="user"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">{t("connection.authType")}</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-1 cursor-pointer text-sm [&_input]:accent-blue-600">
            <input
              type="radio"
              name="authType"
              value="password"
              checked={authType === "password"}
              onChange={() => { setAuthType("password"); }}
            />
            {t("connection.authPassword")}
          </label>
          <label className="flex items-center gap-1 cursor-pointer text-sm [&_input]:accent-blue-600">
            <input
              type="radio"
              name="authType"
              value="key"
              checked={authType === "key"}
              onChange={() => { setAuthType("key"); }}
            />
            {t("connection.authKey")}
          </label>
          <label className="flex items-center gap-1 cursor-pointer text-sm [&_input]:accent-blue-600">
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
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500" htmlFor="conn-password">{t("connection.password")}</label>
          <input
            id="conn-password"
            className="px-2.5 py-[7px] border border-gray-400 rounded bg-white text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); }}
          />
        </div>
      )}

      {authType === "key" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500" htmlFor="conn-privatekey">{t("connection.privateKey")}</label>
          <input
            id="conn-privatekey"
            className="px-2.5 py-[7px] border border-gray-400 rounded bg-white text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            type="text"
            value={privateKeyPath}
            onChange={(e) => { setPrivateKeyPath(e.target.value); }}
            placeholder="~/.ssh/id_rsa"
          />
        </div>
      )}

      <div className="flex gap-2 justify-end mt-2">
        <button type="button" className="px-5 py-2 text-gray-900 border border-gray-300 rounded hover:bg-gray-300" onClick={onCancel}>
          {t("connection.cancel")}
        </button>
        <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
          {t("connection.save")}
        </button>
      </div>
    </form>
  );
}
