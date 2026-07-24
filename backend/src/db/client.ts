import path from "path";
import { DatabaseSync } from "node:sqlite";

const DB_PATH = path.join(__dirname, "..", "..", "app.db");

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    const fs = require("fs");
    if (!fs.existsSync(DB_PATH)) {
      throw new Error(`Database not found at ${DB_PATH}. Run "npm run ingest" first.`);
    }
    db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA foreign_keys = ON");
  }
  return db;
}
