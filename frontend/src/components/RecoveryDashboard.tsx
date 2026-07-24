import { RecoverySummary } from "../lib/types";
import { formatCurrency, formatPercent, STAGE_LABELS } from "../lib/format";

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-forest-900/10 px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-forest-900/50 font-medium">{label}</p>
      <p className="text-2xl font-display font-semibold text-forest-900 mt-1 font-mono">{value}</p>
      {sub && <p className="text-xs text-forest-900/45 mt-1">{sub}</p>}
    </div>
  );
}

export function RecoveryDashboard({ summary }: { summary: RecoverySummary }) {
  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <MetricCard label="Disputes open" value={String(summary.disputeCount)} />
        <MetricCard label="Amount disputed" value={formatCurrency(summary.disputedAmount)} />
        <MetricCard
          label="Recovery rate"
          value={formatPercent(summary.recoveryRate)}
          sub={
            summary.recoveryRate !== null
              ? `${formatCurrency(summary.recoveredAmount)} of ${formatCurrency(
                  summary.knownRecoveryDisputedAmount
                )} with known outcome`
              : "No resolved disputes with a known recovery yet"
          }
        />
        <MetricCard
          label="Awaiting recovery data"
          value={String(summary.unknownRecoveryCount)}
          sub="Resolved before recovery tracking existed"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-forest-900/10 p-4">
          <p className="text-sm font-medium text-forest-900 mb-3">By stage</p>
          <div className="space-y-2">
            {summary.byStage.map((s) => (
              <div key={s.stage} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="text-forest-900/70">{STAGE_LABELS[s.stage] ?? s.stage}</p>
                  <p className="text-[11px] text-forest-900/45">{s.count} disputes</p>
                </div>
                <p className="font-mono text-forest-900 whitespace-nowrap text-right">
                  {formatCurrency(s.amount)}
                </p>
              </div>
            ))}
            {summary.byStage.length === 0 && (
              <p className="text-sm text-forest-900/40">No disputes yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-forest-900/10 p-4">
          <p className="text-sm font-medium text-forest-900 mb-3">By retailer</p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {summary.byRetailer.map((r) => (
              <div key={r.retailerName} className="text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-forest-900/70 truncate pr-2">{r.retailerName}</span>
                  <span className="font-mono text-forest-900 whitespace-nowrap">{r.disputeCount} disputes</span>
                </div>
                <div className="mt-1 text-[11px] text-forest-900/45">
                  {formatCurrency(r.disputedAmount)} · recovery {formatPercent(r.recoveryRate)}
                </div>
              </div>
            ))}
            {summary.byRetailer.length === 0 && (
              <p className="text-sm text-forest-900/40">No disputes yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
