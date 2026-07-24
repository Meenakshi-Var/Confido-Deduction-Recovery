import { cleanToken, matchReason, matchRetailer, DisputeReason, Retailer } from "./match";
import { parseAmount, parseBoolean, parseDate } from "./parse";
import { NormalizedDeduction, QualityFlag, RawDeduction } from "./types";

export interface Company {
  id: number;
  name: string;
  slug: string;
  erp_system: string | null;
  default_currency: string;
  is_active: boolean;
}

export interface NormalizeContext {
  companies: Company[];
  retailers: Retailer[];
  reasons: DisputeReason[];
}

const SUSPICIOUS_AMOUNT_THRESHOLD = 100_000; // a single deduction over $100k is worth a human's eyes

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Normalizes one raw export row. Never throws: anything it can't confidently
 * resolve becomes a QualityFlag on the record rather than a dropped row or a
 * guessed value, so nothing disappears silently.
 */
export function normalizeOne(
  raw: RawDeduction,
  ctx: NormalizeContext,
  index: number
): NormalizedDeduction {
  const flags: QualityFlag[] = [];

  // --- id ---
  let sourceId: string;
  const rawId = cleanToken(raw.id);
  if (rawId === null) {
    flags.push("MISSING_ID");
    sourceId = `synth-${index}`;
  } else {
    sourceId = rawId;
  }

  // --- company ---
  let companyId: number | null = null;
  const rawCompanyId = raw.company_id;
  if (rawCompanyId === null || rawCompanyId === undefined || rawCompanyId === "") {
    flags.push("MISSING_COMPANY");
  } else {
    const n = Number(rawCompanyId);
    if (isNaN(n)) {
      flags.push("MISSING_COMPANY");
    } else if (!ctx.companies.some((c) => c.id === n)) {
      flags.push("UNKNOWN_COMPANY");
      companyId = n; // preserved for visibility even though it doesn't resolve
    } else {
      companyId = n;
    }
  }

  // --- retailer ---
  const retailerRaw = cleanToken(raw.retailer_name) ?? cleanToken(raw.retailer);
  if (!retailerRaw) {
    flags.push("MISSING_RETAILER");
  }
  const { id: retailerId } = matchRetailer(retailerRaw, ctx.retailers);
  if (retailerRaw && retailerId === null) {
    flags.push("UNRECOGNIZED_RETAILER");
  }

  // --- reason ---
  const reasonRaw = cleanToken(raw.reason) ?? cleanToken(raw.deduction_reason);
  if (!reasonRaw) {
    flags.push("MISSING_REASON");
  }
  const { code: reasonCode } = matchReason(reasonRaw, ctx.reasons);
  if (reasonRaw && reasonCode === null) {
    flags.push("UNRECOGNIZED_REASON");
  }

  // --- amount --- (some rows use `amount`, a few use `total_amount` instead; a
  // handful have been seen with both — treat that as worth a flag, not silently
  // picking one)
  const amountFromAmount = parseAmount(raw.amount);
  const amountFromTotal = parseAmount(raw.total_amount);
  let amount: number | null;
  if (amountFromAmount !== null && amountFromTotal !== null) {
    flags.push("CONFLICTING_AMOUNT_FIELDS");
    amount = amountFromAmount;
  } else {
    amount = amountFromAmount ?? amountFromTotal;
  }
  if (amount === null) {
    flags.push("MISSING_AMOUNT");
  } else {
    if (amount < 0) {
      flags.push("NEGATIVE_AMOUNT");
      amount = Math.abs(amount);
    }
    if (amount > SUSPICIOUS_AMOUNT_THRESHOLD) {
      flags.push("SUSPICIOUS_AMOUNT_MAGNITUDE");
    }
  }

  // --- date ---
  const rawDateToken = cleanToken(raw.deducted_at);
  const deductedAt = rawDateToken ? parseDate(raw.deducted_at) : null;
  if (!rawDateToken) {
    flags.push("MISSING_DATE");
  } else if (deductedAt === null) {
    flags.push("UNPARSEABLE_DATE");
  } else if (deductedAt > today()) {
    flags.push("FUTURE_DATE");
  }

  // --- status ---
  const statusRaw = cleanToken(raw.status);
  if (!statusRaw) {
    flags.push("MISSING_STATUS");
  }

  return {
    sourceId,
    companyId,
    retailerId,
    retailerNameRaw: retailerRaw,
    reasonCode,
    reasonRaw,
    invoiceNumber: cleanToken(raw.invoice_number),
    amount,
    deductedAt,
    statusRaw,
    isDeleted: parseBoolean(raw.is_deleted, false),
    notes: cleanToken(raw.notes),
    flags,
    raw,
  };
}

export function normalizeAll(rows: RawDeduction[], ctx: NormalizeContext): NormalizedDeduction[] {
  const result = rows.map((r, i) => normalizeOne(r, ctx, i));

  // duplicate id detection needs the full set, so it happens as a second pass
  const seen = new Map<string, number>();
  for (const r of result) {
    seen.set(r.sourceId, (seen.get(r.sourceId) ?? 0) + 1);
  }
  for (const r of result) {
    if ((seen.get(r.sourceId) ?? 0) > 1 && !r.flags.includes("DUPLICATE_ID")) {
      r.flags.push("DUPLICATE_ID");
    }
  }

  return result;
}
