import { FLAG_LABELS } from "../lib/format";

const SEVERITY: Record<string, "high" | "medium"> = {
  MISSING_AMOUNT: "high",
  UNKNOWN_COMPANY: "high",
  CONFLICTING_AMOUNT_FIELDS: "high",
  SUSPICIOUS_AMOUNT_MAGNITUDE: "high",
  DUPLICATE_ID: "high",
  MISSING_ID: "medium",
  UNRECOGNIZED_RETAILER: "medium",
  MISSING_RETAILER: "medium",
  UNRECOGNIZED_REASON: "medium",
  MISSING_REASON: "medium",
  NEGATIVE_AMOUNT: "medium",
  UNPARSEABLE_DATE: "medium",
  MISSING_DATE: "medium",
  FUTURE_DATE: "high",
  MISSING_STATUS: "medium",
  MISSING_COMPANY: "high",
};

export function FlagBadge({ flag }: { flag: string }) {
  const severity = SEVERITY[flag] ?? "medium";
  const cls =
    severity === "high"
      ? "bg-clay-100 text-clay-600 border-clay-400/30"
      : "bg-forest-50 text-forest-700 border-forest-300/40";
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded border ${cls} whitespace-nowrap`}
      title={flag}
    >
      {FLAG_LABELS[flag] ?? flag}
    </span>
  );
}
