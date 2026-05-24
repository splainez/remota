import { type QueryExecResult, type Database as SqlJsDb, type SqlValue } from "sql.js";

interface RawStatement {
	get(...params: unknown[]): unknown[] | undefined;
	all(...params: unknown[]): unknown[][];
	values(...params: unknown[]): unknown[][];
}

interface PreparedStatement {
	run(...params: unknown[]): { changes: number; lastInsertRowid: number };
	get(...params: unknown[]): Record<string, unknown> | undefined;
	all(...params: unknown[]): Record<string, unknown>[];
	values(...params: unknown[]): unknown[][];
	raw(): RawStatement;
}

export class SqlJsDatabase {
	private db: SqlJsDb;

	constructor(db: SqlJsDb) {
		this.db = db;
	}

	prepare(sql: string): PreparedStatement {
		const db = this.db;

		function bindParams(stmt: ReturnType<SqlJsDb["prepare"]>, params: unknown[]) {
			if (params.length === 1 && Array.isArray(params[0])) {
				stmt.bind(params[0] as SqlValue[]);
			} else if (params.length > 0) {
				stmt.bind(params as SqlValue[]);
			}
		}

		const stmtObj: PreparedStatement = {
			run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
				const stmt = db.prepare(sql);
				try {
					bindParams(stmt, params);
					stmt.step();
					const lastInsertRowid = (db as unknown as { lastInsertRowid: number }).lastInsertRowid;
					return { changes: db.getRowsModified(), lastInsertRowid };
				} finally {
					stmt.free();
				}
			},
		get(...params: unknown[]): Record<string, unknown> | undefined {
				const stmt = db.prepare(sql);
				try {
					bindParams(stmt, params);
					if (stmt.step()) {
						return stmt.getAsObject();
					}
				} finally {
					stmt.free();
				}
			},
			all(...params: unknown[]): Record<string, unknown>[] {
				const results: Record<string, unknown>[] = [];
				const stmt = db.prepare(sql);
				try {
					bindParams(stmt, params);
					while (stmt.step()) {
						results.push(stmt.getAsObject());
					}
				} finally {
					stmt.free();
				}
				return results;
			},
			values(...params: unknown[]): unknown[][] {
				const results: unknown[][] = [];
				const stmt = db.prepare(sql);
				try {
					bindParams(stmt, params);
					while (stmt.step()) {
						results.push(stmt.get());
					}
				} finally {
					stmt.free();
				}
				return results;
			},
			raw(): RawStatement {
				return {
					get(...params: unknown[]): unknown[] | undefined {
						const stmt = db.prepare(sql);
						try {
							bindParams(stmt, params);
							if (stmt.step()) {
								return stmt.get();
							}
						} finally {
							stmt.free();
						}
					},
					all(...params: unknown[]): unknown[][] {
						const results: unknown[][] = [];
						const stmt = db.prepare(sql);
						try {
							bindParams(stmt, params);
							while (stmt.step()) {
								results.push(stmt.get());
							}
						} finally {
							stmt.free();
						}
						return results;
					},
					values(...params: unknown[]): unknown[][] {
						return this.all(...params);
					},
				};
			},
		};

		return stmtObj;
	}

	exec(sql: string): void {
		this.db.exec(sql);
	}

	run(sql: string, ...params: unknown[]): { changes: number; lastInsertRowid: number } {
		return this.prepare(sql).run(...params);
	}

	get(sql: string, ...params: unknown[]): Record<string, unknown> | undefined {
		return this.prepare(sql).get(...params);
	}

	all(sql: string, ...params: unknown[]): Record<string, unknown>[] {
		return this.prepare(sql).all(...params);
	}

	values(sql: string, ...params: unknown[]): unknown[][] {
		return this.prepare(sql).values(...params);
	}

	close(): void {
		this.db.close();
	}

	exportBinary(): Uint8Array {
		return this.db.export();
	}
}

export type { QueryExecResult, SqlJsDb };

