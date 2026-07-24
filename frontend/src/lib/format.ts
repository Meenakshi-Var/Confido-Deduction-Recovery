export function formatCurrency(amount: number | null): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function formatPercent(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(0)}%`;
}

export const FLAG_LABELS: Record<string, string> = {
  MISSING_ID: "Missing ID",
  DUPLICATE_ID: "Duplicate ID",
  UNKNOWN_COMPANY: "Unknown company",
  MISSING_COMPANY: "Missing company",
  UNRECOGNIZED_RETAILER: "Unrecognized retailer",
  MISSING_RETAILER: "Missing retailer",
  UNRECOGNIZED_REASON: "Unrecognized reason",
  MISSING_REASON: "Missing reason",
  MISSING_AMOUNT: "Missing amount",
  NEGATIVE_AMOUNT: "Negative amount corrected",
  SUSPICIOUS_AMOUNT_MAGNITUDE: "Unusually large amount",
  UNPARSEABLE_DATE: "Unparseable date",
  MISSING_DATE: "Missing date",
  FUTURE_DATE: "Date looks mistyped",
  UNRECOGNIZED_STATUS: "Unrecognized status",
  MISSING_STATUS: "Missing status",
  CONFLICTING_AMOUNT_FIELDS: "Conflicting amount fields",
};

export const STAGE_LABELS: Record<string, string> = {
  NOT_DISPUTED: "Not disputed",
  UNDER_REVIEW: "Under review",
  FILING: "Filing",
  FILED: "Filed",
  RESOLVED: "Resolved",
};

export const STAGE_ORDER = ["NOT_DISPUTED", "UNDER_REVIEW", "FILING", "FILED", "RESOLVED"];
