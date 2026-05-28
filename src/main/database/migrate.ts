import { existsSync, renameSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LoggerFactory } from "../../shared/lib/logger";
import type { Connection } from "../../shared/types";

const log = LoggerFactory.init({ name: "migrate" });

interface SqliteRow {
	id: number;
	name: string;
	protocol: string;
	host: string;
	port: number;
	username: string;
	auth_type: string;
	password: string;
	private_key_path: string;
	access_key: string;
	secret_key: string;
	region: string;
	bucket: string;
	endpoint: string;
	use_https: number;
	group_name: string;
	created_at: string;
	updated_at: string;
}

function rowToConnection(row: SqliteRow): Connection {
	const authType: Connection["authType"] =
		row.auth_type === "password" || row.auth_type === "key" || row.auth_type === "agent" ? row.auth_type : "password";

	return {
		id: row.id,
		name: row.name,
		protocol: row.protocol,
		host: row.host,
		port: row.port,
		username: row.username,
		authType,
		password: row.password,
		privateKeyPath: row.private_key_path,
		accessKey: row.access_key,
		secretKey: row.secret_key,
		region: row.region,
		bucket: row.bucket,
		endpoint: row.endpoint,
		useHttps: row.use_https === 1,
		groupName: row.group_name,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export async function migrateFromSqlite(userDataPath: string, connectionsJsonPath: string): Promise<boolean> {
	if (existsSync(connectionsJsonPath)) {
		log.info("connections.json already exists, skipping migration");
		return false;
	}

	const dbPath = join(userDataPath, "openscp.db");
	if (!existsSync(dbPath)) {
		log.info("No SQLite database found, skipping migration");
		return false;
	}

	log.info("Migrating connections from SQLite to JSON");

	try {
		const initSqlJs = (await import("sql.js")).default;
		const SQL = await initSqlJs();

		const buffer = readFileSync(dbPath);
		const sqlDb = new SQL.Database(buffer);

		const results = sqlDb.exec("SELECT * FROM connections");

		if (results.length === 0 || results[0].values.length === 0) {
			log.info("No connections in SQLite database");
			sqlDb.close();
			return false;
		}

		const columnNames = results[0].columns;
		const rows = results[0].values.map((row) => {
			const obj: Record<string, unknown> = {};
			columnNames.forEach((col, i) => {
				obj[col] = row[i];
			});
			return obj as unknown as SqliteRow;
		});

		const connections = rows.map(rowToConnection);
		let maxId = 0;
		for (const c of connections) {
			if (c.id > maxId) maxId = c.id;
		}

		const data = {
			nextId: maxId + 1,
			connections,
		};

		writeFileSync(connectionsJsonPath, JSON.stringify(data, null, 2), "utf-8");

		sqlDb.close();

		const backupPath = dbPath + ".bak";
		renameSync(dbPath, backupPath);
		log.info({ count: connections.length }, "Migration complete, backed up old DB");

		return true;
	} catch (err) {
		log.error({ err }, "Migration failed");
		return false;
	}
}
