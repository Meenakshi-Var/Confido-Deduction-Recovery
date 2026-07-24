import { getDb } from "../db/client";
import { DisputeStage } from "../state-machine/dispute";

export interface DeductionDto {
  sourceId: string;
  companyId: number | null;
  companyName: string | null;
  retailerId: number | null;
  retailerName: string | null;
  retailerNameRaw: string | null;
  reasonCode: string | null;
  reasonLabel: string | null;
  reasonCategory: string | null;
  reasonRaw: string | null;
  typicallyDisputable: boolean | null;
  invoiceNumber: string | null;
  amount: number | null;
  deductedAt: string | null;
  notes: string | null;
  flags: string[];
  dispute: {
    id: number;
    stage: DisputeStage;
    recoveredAmount: number | null;
    recoveryAmountKnown: boolean;
    resolutionOutcome: string | null;
    updatedAt: string;
  } | null;
}

const SELECT = `
  SELECT
    d.source_id, d.company_id, c.name AS company_name,
    d.retailer_id, r.name AS retailer_name, d.retailer_name_raw,
    d.reason_code, dr.label AS reason_label, dr.category AS reason_category, dr.typically_disputable,
    d.reason_raw, d.invoice_number, d.amount, d.deducted_at, d.notes, d.flags_json,
    disp.id AS dispute_id, disp.stage, disp.recovered_amount, disp.recovery_amount_known,
    disp.resolution_outcome, disp.updated_at AS dispute_updated_at
  FROM deductions d
  LEFT JOIN companies c ON c.id = d.company_id
  LEFT JOIN retailers r ON r.id = d.retailer_id
  LEFT JOIN dispute_reasons dr ON dr.code = d.reason_code
  LEFT JOIN disputes disp ON disp.deduction_source_id = d.source_id
`;

function rowToDto(row: any): DeductionDto {
  return {
    sourceId: row.source_id,
    companyId: row.company_id,
    companyName: row.company_name,
    retailerId: row.retailer_id,
    retailerName: row.retailer_name,
    retailerNameRaw: row.retailer_name_raw,
    reasonCode: row.reason_code,
    reasonLabel: row.reason_label,
    reasonCategory: row.reason_category,
    reasonRaw: row.reason_raw,
    typicallyDisputable: row.typically_disputable === null ? null : !!row.typically_disputable,
    invoiceNumber: row.invoice_number,
    amount: row.amount,
    deductedAt: row.deducted_at,
    notes: row.notes,
    flags: JSON.parse(row.flags_json),
    dispute: row.dispute_id
      ? {
          id: row.dispute_id,
          stage: row.stage,
          recoveredAmount: row.recovered_amount,
          recoveryAmountKnown: !!row.recovery_amount_known,
          resolutionOutcome: row.resolution_outcome,
          updatedAt: row.dispute_updated_at,
        }
      : null,
  };
}

export function listDeductions(companyId: number, includeDeleted = false): DeductionDto[] {
  const db = getDb();
  const clause = includeDeleted ? "" : "AND d.is_deleted = 0";
  const rows = db
    .prepare(`${SELECT} WHERE d.company_id = ? ${clause} ORDER BY d.deducted_at DESC`)
    .all(companyId);
  return rows.map(rowToDto);
}

export function getDeduction(sourceId: string): DeductionDto | null {
  const db = getDb();
  const row = db.prepare(`${SELECT} WHERE d.source_id = ?`).get(sourceId);
  return row ? rowToDto(row) : null;
}

export function getDeductionAmount(sourceId: string): number {
  const db = getDb();
  const row = db.prepare(`SELECT amount FROM deductions WHERE source_id = ?`).get(sourceId) as
    | { amount: number | null }
    | undefined;
  return row?.amount ?? 0;
}
