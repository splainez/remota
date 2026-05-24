import initSqlJs from "sql.js";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { connections } from "./schema";
import { SqlJsDatabase } from "./sqljs-adapter";

export type DatabaseInstance = BetterSQLite3Database<{ connections: typeof connections }>;

export async function initDatabase(userDataPath: string): Promise<DatabaseInstance> {
	mkdirSync(userDataPath, { recursive: true });
	const dbPath = join(userDataPath, "openscp.db");

	const SQL = await initSqlJs();

	let sqlJsDb;
	if (existsSync(dbPath)) {
		const buffer = readFileSync(dbPath);
		sqlJsDb = new SQL.Database(buffer);
	} else {
		sqlJsDb = new SQL.Database();
	}

	sqlJsDb.run("PRAGMA journal_mode = WAL");
	sqlJsDb.run("PRAGMA foreign_keys = ON");

	sqlJsDb.run(`
    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      protocol TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 22,
      username TEXT NOT NULL DEFAULT '',
      auth_type TEXT NOT NULL DEFAULT 'password',
      password TEXT NOT NULL DEFAULT '',
      private_key_path TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

	const wrapper = new SqlJsDatabase(sqlJsDb);

	const persist = () => {
		const data = sqlJsDb.export();
		writeFileSync(dbPath, Buffer.from(data));
	};

	wrapper.exec.bind(wrapper);
	wrapper.exec = (sql: string) => {
		sqlJsDb.run(sql);
		persist();
	};

	const originalRun = wrapper.run.bind(wrapper);
	wrapper.run = (sql: string, ...params: unknown[]) => {
		const result = originalRun(sql, ...params);
		persist();
		return result;
	};

	const db = drizzle(wrapper as never, { schema: { connections } });

	return db;
}
