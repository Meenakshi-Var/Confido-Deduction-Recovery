import fs from "fs";
import initSqlJs, { Database as SqlJsDatabase } from "sql.js";

/**
 * sql.js is pure JavaScript + WebAssembly - no native compilation, no
 * minimum Node version beyond WASM support (long since universal). That
 * makes it the right choice here over better-sqlite3 (needs a matching
 * prebuilt binary or a C++ toolchain to compile one) or node:sqlite (built
 * into Node, but only Node 22.5+, and still experimental): whoever is
 * running this to evaluate it shouldn't need to know or care what Node
 * version they have.
 *
 * The tradeoff is that sql.js keeps the database entirely in memory and
 * has no native file-backed mode - "persisting" means serializing the
 * whole thing and writing it to disk ourselves. We do that after every
 * write (see StatementWrapper.run below), except during bulk ingestion
 * where that would mean re-serializing the whole DB on every one of ~1600
 * inserts; ingest.ts disables auto-persist for the duration of the load
 * and persists once at the end instead.
 */

let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;
let db: SqlJsDatabase | null = null;
let dbPath: string | null = null;
let autoPersist = true;

export async function initDb(path: string, createIfMissing: boolean): Promise<void> {
  if (!SQL) SQL = await initSqlJs();
  dbPath = path;
  if (fs.existsSync(path)) {
    db = new SQL.Database(fs.readFileSync(path));
  } else if (createIfMissing) {
    db = new SQL.Database();
  } else {
    throw new Error(`Database not found at ${path}. Run "npm run ingest" first.`);
  }
}

export function setAutoPersist(value: boolean) {
  autoPersist = value;
}

export function persist() {
  if (!db || !dbPath || dbPath === ":memory:") return;
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

function bindParams(params: unknown[]): unknown[] | Record<string, unknown> {
  if (params.length === 1 && typeof params[0] === "object" && params[0] !== null && !Array.isArray(params[0])) {
    // sql.js's named-parameter binding requires the sigil (@, :, or $) to be
    // part of the object key itself, unlike better-sqlite3/node:sqlite which
    // accept bare keys and match them against whichever sigil the SQL uses.
    // Expanding each bare key to all three sigil forms keeps call sites
    // (written with bare keys, e.g. `{ source_id: ... }`) unchanged; sql.js
    // silently ignores whichever forms don't match the statement's actual
    // placeholders.
    const obj = params[0] as Record<string, unknown>;
    const expanded: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      expanded[`@${key}`] = value;
      expanded[`:${key}`] = value;
      expanded[`$${key}`] = value;
    }
    return expanded;
  }
  return params;
}

class StatementWrapper {
  constructor(private sql: string) {}

  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint } {
    if (!db) throw new Error("DB not initialized");
    const stmt = db.prepare(this.sql);
    stmt.bind(bindParams(params) as any);
    stmt.step();
    stmt.free();
    const changes = db.getRowsModified();
    const idResult = db.exec("SELECT last_insert_rowid() AS id");
    const lastInsertRowid = (idResult[0]?.values[0]?.[0] as number) ?? 0;
    if (autoPersist) persist();
    return { changes, lastInsertRowid };
  }

  get(...params: unknown[]): any {
    if (!db) throw new Error("DB not initialized");
    const stmt = db.prepare(this.sql);
    stmt.bind(bindParams(params) as any);
    let result: any;
    if (stmt.step()) result = stmt.getAsObject();
    stmt.free();
    return result;
  }

  all(...params: unknown[]): any[] {
    if (!db) throw new Error("DB not initialized");
    const stmt = db.prepare(this.sql);
    stmt.bind(bindParams(params) as any);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
}

export interface DbHandle {
  exec(sql: string): void;
  prepare(sql: string): StatementWrapper;
  close(): void;
}

export function getDb(): DbHandle {
  if (!db) throw new Error("DB not initialized. Call initDb() first.");
  return {
    exec: (sql: string) => {
      db!.exec(sql);
    },
    prepare: (sql: string) => new StatementWrapper(sql),
    close: () => {
      persist();
    },
  };
}
