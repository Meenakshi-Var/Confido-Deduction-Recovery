/**
 * A normalized deduction is what the rest of the app works with.
 * `raw` is preserved verbatim so a flagged record can always be inspected
 * against the original export line — normalization should be legible, not lossy.
 */
export interface RawDeduction {
  id?: unknown;
  company_id?: unknown;
  retailer_name?: unknown;
  retailer?: unknown;
  reason?: unknown;
  deduction_reason?: unknown;
  invoice_number?: unknown;
  amount?: unknown;
  total_amount?: unknown;
  deducted_at?: unknown;
  status?: unknown;
  is_deleted?: unknown;
  notes?: unknown;
  [key: string]: unknown;
}

export type QualityFlag =
  | "MISSING_ID"
  | "DUPLICATE_ID"
  | "UNKNOWN_COMPANY"
  | "MISSING_COMPANY"
  | "UNRECOGNIZED_RETAILER"
  | "MISSING_RETAILER"
  | "UNRECOGNIZED_REASON"
  | "MISSING_REASON"
  | "MISSING_AMOUNT"
  | "NEGATIVE_AMOUNT"
  | "SUSPICIOUS_AMOUNT_MAGNITUDE"
  | "UNPARSEABLE_DATE"
  | "MISSING_DATE"
  | "FUTURE_DATE"
  | "UNRECOGNIZED_STATUS"
  | "MISSING_STATUS"
  | "CONFLICTING_AMOUNT_FIELDS";

export interface NormalizedDeduction {
  sourceId: string; // stable string id, synthesized if the source id was missing/duplicate
  companyId: number | null;
  retailerId: number | null;
  retailerNameRaw: string | null;
  reasonCode: string | null; // matches dispute_reasons.json `code`, null if unrecognized
  reasonRaw: string | null;
  invoiceNumber: string | null;
  amount: number | null; // absolute value, in dollars
  deductedAt: string | null; // ISO 8601 date, YYYY-MM-DD
  statusRaw: string | null;
  isDeleted: boolean;
  notes: string | null;
  flags: QualityFlag[];
  raw: RawDeduction;
}
