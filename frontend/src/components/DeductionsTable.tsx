import { Deduction } from "../lib/types";
import { formatCurrency } from "../lib/format";
import { FlagBadge } from "./FlagBadge";
import { StageBadge } from "./StageBadge";

export function DeductionsTable({
  deductions,
  onSelect,
}: {
  deductions: Deduction[];
  onSelect: (d: Deduction) => void;
}) {
  if (deductions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-forest-900/10 p-10 text-center text-forest-900/50">
        No deductions match the current filters.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-forest-900/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-forest-900/10 text-left text-forest-900/50 text-xs uppercase tracking-wide">
            <th className="px-4 py-3 font-medium">Retailer</th>
            <th className="px-4 py-3 font-medium">Reason</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Data quality</th>
            <th className="px-4 py-3 font-medium">Stage</th>
          </tr>
        </thead>
        <tbody>
          {deductions.map((d) => (
            <tr
              key={d.sourceId}
              onClick={() => onSelect(d)}
              className="border-b border-forest-900/5 last:border-0 hover:bg-forest-50/60 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3">
                <div className="font-medium text-ink">{d.retailerName ?? d.retailerNameRaw ?? "—"}</div>
                <div className="text-xs text-forest-900/40 font-mono">{d.invoiceNumber ?? "no invoice #"}</div>
              </td>
              <td className="px-4 py-3">
                <div className="text-ink">{d.reasonLabel ?? d.reasonRaw ?? "—"}</div>
                {d.typicallyDisputable !== null && (
                  <div className="text-xs text-forest-900/40">
                    {d.typicallyDisputable ? "Typically disputable" : "Typically not disputed"}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono text-ink">{formatCurrency(d.amount)}</td>
              <td className="px-4 py-3 text-forest-900/70 font-mono text-xs">{d.deductedAt ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1 max-w-[220px]">
                  {d.flags.length === 0 ? (
                    <span className="text-xs text-forest-900/30">Clean</span>
                  ) : (
                    d.flags.map((f) => <FlagBadge key={f} flag={f} />)
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <StageBadge stage={d.dispute?.stage ?? "NOT_DISPUTED"} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
