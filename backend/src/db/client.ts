import path from "path";
import Database from "better-sqlite3";

const DB_PATH = path.join(__dirname, "..", "..", "app.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { fileMustExist: true });
    db.pragma("foreign_keys = ON");
  }
  return db;
}
