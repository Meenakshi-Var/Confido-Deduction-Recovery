import path from "path";
import fs from "fs";
import { DatabaseSync } from "node:sqlite";
import { applySchema } from "./schema";
import { normalizeAll, Company } from "../normalize/normalize";
import { RawDeduction } from "../normalize/types";
import { Retailer, DisputeReason } from "../normalize/match";
import { mapLegacyStatus } from "../state-machine/dispute";

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DB_PATH = path.join(__dirname, "..", "..", "app.db");

function loadJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));
}

export function ingest() {
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  const db = new DatabaseSync(DB_PATH);
  applySchema(db);

  const companies = loadJson<Company[]>("companies.json");
  const retailers = loadJson<Retailer[]>("retailers.json");
  const reasons = loadJson<DisputeReason[]>("dispute_reasons.json");
  const rawDeductions = loadJson<RawDeduction[]>("deductions.json");

  const insertCompany = db.prepare(
    `INSERT INTO companies (id, name, slug, erp_system, default_currency, is_active) VALUES (?,?,?,?,?,?)`
  );
  for (const c of companies) {
    insertCompany.run(c.id, c.name, c.slug, c.erp_system, c.default_currency, c.is_active ? 1 : 0);
  }

  const insertRetailer = db.prepare(`INSERT INTO retailers (id, name, type, region) VALUES (?,?,?,?)`);
  for (const r of retailers) insertRetailer.run(r.id, r.name, r.type, r.region);

  const insertReason = db.prepare(
    `INSERT INTO dispute_reasons (code, label, category, typically_disputable) VALUES (?,?,?,?)`
  );
  for (const r of reasons) insertReason.run(r.code, r.label, r.category, r.typically_disputable ? 1 : 0);

  const normalized = normalizeAll(rawDeductions, { companies, retailers, reasons });

  const insertDeduction = db.prepare(`
    INSERT INTO deductions
      (source_id, company_id, retailer_id, retailer_name_raw, reason_code, reason_raw,
       invoice_number, amount, deducted_at, status_raw, is_deleted, notes, flags_json, raw_json)
    VALUES (@source_id,@company_id,@retailer_id,@retailer_name_raw,@reason_code,@reason_raw,
            @invoice_number,@amount,@deducted_at,@status_raw,@is_deleted,@notes,@flags_json,@raw_json)
  `);

  const insertDispute = db.prepare(`
    INSERT INTO disputes (deduction_source_id, stage, recovered_amount, recovery_amount_known, resolution_outcome, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?)
  `);
  const insertEvent = db.prepare(`
    INSERT INTO dispute_events (dispute_id, from_stage, to_stage, note, recovered_amount, created_at)
    VALUES (?,?,?,?,?,?)
  `);

  const now = new Date().toISOString();
  const seen = new Set<string>();
  let skippedDuplicates = 0;
  let seededDisputes = 0;
  let unknownRecoverySeeded = 0;

  db.exec("BEGIN");
  try {
    for (const d of normalized) {
      if (seen.has(d.sourceId)) {
        // Duplicate ids are flagged by the normalizer; we still only persist
        // the first occurrence so the DB has one row per real deduction.
        skippedDuplicates++;
        continue;
      }
      seen.add(d.sourceId);

      insertDeduction.run({
        source_id: d.sourceId,
        company_id: d.companyId,
        retailer_id: d.retailerId,
        retailer_name_raw: d.retailerNameRaw,
        reason_code: d.reasonCode,
        reason_raw: d.reasonRaw,
        invoice_number: d.invoiceNumber,
        amount: d.amount,
        deducted_at: d.deductedAt,
        status_raw: d.statusRaw,
        is_deleted: d.isDeleted ? 1 : 0,
        notes: d.notes,
        flags_json: JSON.stringify(d.flags),
        raw_json: JSON.stringify(d.raw),
      });

      const stage = mapLegacyStatus(d.statusRaw);
      if (stage !== "NOT_DISPUTED") {
        seededDisputes++;
        // Legacy exports never recorded how much was actually recovered, so a
        // seeded RESOLVED dispute has an *unknown* recovery until an analyst
        // backfills it. This is deliberately distinct from "denied" ($0).
        const recoveryKnown = false;
        if (stage === "RESOLVED") unknownRecoverySeeded++;

        const result = insertDispute.run(
          d.sourceId,
          stage,
          null,
          recoveryKnown ? 1 : 0,
          null,
          now,
          now
        );
        insertEvent.run(
          result.lastInsertRowid,
          null,
          stage,
          `Seeded from legacy export status "${d.statusRaw}".`,
          null,
          now
        );
      }
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  console.log(`Ingested ${normalized.length} raw rows.`);
  console.log(`  ${seen.size} unique deductions persisted (${skippedDuplicates} duplicate ids skipped).`);
  console.log(`  ${seededDisputes} disputes seeded from legacy status.`);
  console.log(`  ${unknownRecoverySeeded} of those are RESOLVED with recovery amount unknown (legacy export never recorded it).`);

  db.close();
}

if (require.main === module) {
  ingest();
}
