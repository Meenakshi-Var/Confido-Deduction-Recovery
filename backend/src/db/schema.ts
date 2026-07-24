import Database from "better-sqlite3";

export function applySchema(db: Database.Database) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      erp_system TEXT,
      default_currency TEXT NOT NULL,
      is_active INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS retailers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      region TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dispute_reasons (
      code TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      category TEXT NOT NULL,
      typically_disputable INTEGER NOT NULL
    );

    -- One row per normalized deduction from the export. raw_json and flags_json
    -- preserve everything normalization discovered, so nothing is lossy.
    CREATE TABLE IF NOT EXISTS deductions (
      source_id TEXT PRIMARY KEY,
      company_id INTEGER,
      retailer_id INTEGER,
      retailer_name_raw TEXT,
      reason_code TEXT,
      reason_raw TEXT,
      invoice_number TEXT,
      amount REAL,
      deducted_at TEXT,
      status_raw TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      flags_json TEXT NOT NULL,
      raw_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_deductions_company ON deductions(company_id);

    -- A dispute exists once an analyst (or the legacy export) has moved a
    -- deduction out of NOT_DISPUTED. deduction_source_id is unique: a
    -- deduction has at most one active dispute lifecycle.
    CREATE TABLE IF NOT EXISTS disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deduction_source_id TEXT NOT NULL UNIQUE REFERENCES deductions(source_id),
      stage TEXT NOT NULL,
      recovered_amount REAL,
      recovery_amount_known INTEGER NOT NULL DEFAULT 0,
      resolution_outcome TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Full audit trail of every stage transition, including the seed event
    -- created at ingest time for deductions that already had a status in
    -- the legacy export.
    CREATE TABLE IF NOT EXISTS dispute_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispute_id INTEGER NOT NULL REFERENCES disputes(id),
      from_stage TEXT,
      to_stage TEXT NOT NULL,
      note TEXT,
      recovered_amount REAL,
      created_at TEXT NOT NULL
    );
  `);
}
