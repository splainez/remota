import initSqlJs, { type Database as SqlJsDb, type QueryExecResult, type SqlValue } from "sql.js";

interface RawStatement {
  get<T extends unknown[] = unknown[]>(...params: unknown[]): T | undefined;
  all<T extends unknown[] = unknown[]>(...params: unknown[]): T[];
  values<T extends unknown[] = unknown[]>(...params: unknown[]): T[];
}

interface PreparedStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  get<T = Record<string, unknown>>(...params: unknown[]): T | undefined;
  all<T = Record<string, unknown>>(...params: unknown[]): T[];
  values<T extends unknown[] = unknown[]>(...params: unknown[]): T[];
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
          const lastInsertRowid = (db as unknown as Record<string, () => number>).lastInsertRowid?.() ?? 0;
          return { changes: db.getRowsModified(), lastInsertRowid: Number(lastInsertRowid) };
        } finally {
          stmt.free();
        }
      },
      get<T = Record<string, unknown>>(...params: unknown[]): T | undefined {
        const stmt = db.prepare(sql);
        try {
          bindParams(stmt, params);
          if (stmt.step()) {
            return stmt.getAsObject() as unknown as T;
          }
        } finally {
          stmt.free();
        }
      },
      all<T = Record<string, unknown>>(...params: unknown[]): T[] {
        const results: T[] = [];
        const stmt = db.prepare(sql);
        try {
          bindParams(stmt, params);
          while (stmt.step()) {
            results.push(stmt.getAsObject() as unknown as T);
          }
        } finally {
          stmt.free();
        }
        return results;
      },
      values<T extends unknown[] = unknown[]>(...params: unknown[]): T[] {
        const results: T[] = [];
        const stmt = db.prepare(sql);
        try {
          bindParams(stmt, params);
          while (stmt.step()) {
            results.push(stmt.get() as T);
          }
        } finally {
          stmt.free();
        }
        return results;
      },
      raw(): RawStatement {
        return {
          get<T extends unknown[] = unknown[]>(...params: unknown[]): T | undefined {
            const stmt = db.prepare(sql);
            try {
              bindParams(stmt, params);
              if (stmt.step()) {
                return stmt.get() as T;
              }
            } finally {
              stmt.free();
            }
          },
          all<T extends unknown[] = unknown[]>(...params: unknown[]): T[] {
            const results: T[] = [];
            const stmt = db.prepare(sql);
            try {
              bindParams(stmt, params);
              while (stmt.step()) {
                results.push(stmt.get() as T);
              }
            } finally {
              stmt.free();
            }
            return results;
          },
          values<T extends unknown[] = unknown[]>(...params: unknown[]): T[] {
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

  get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
    return this.prepare(sql).get(...params);
  }

  all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
    return this.prepare(sql).all(...params);
  }

  values<T extends unknown[] = unknown[]>(sql: string, ...params: unknown[]): T[] {
    return this.prepare(sql).values(...params);
  }

  close(): void {
    this.db.close();
  }

  exportBinary(): Uint8Array {
    return this.db.export();
  }
}

export type { SqlJsDb, QueryExecResult };
