declare module "better-sqlite3" {
  class Database {
    constructor(filename: string, options?: Record<string, unknown>);
    prepare(sql: string): Statement;
    exec(sql: string): this;
    close(): void;
    pragma(pragma: string, options?: { simple?: boolean }): unknown;
  }
  class Statement {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    values(...params: unknown[]): unknown[][];
    bind(params: unknown[]): this;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): void;
  }
}
