import { useEffect, useState } from "react";
import { Deduction, DisputeStage } from "../lib/types";
import { formatCurrency, STAGE_LABELS, STAGE_ORDER } from "../lib/format";
import { FlagBadge } from "./FlagBadge";
import { api } from "../lib/api";

const NEXT_STAGE: Partial<Record<DisputeStage, DisputeStage>> = {
  UNDER_REVIEW: "FILING",
  FILING: "FILED",
};
const BACK_STAGE: Partial<Record<DisputeStage, DisputeStage>> = {
  UNDER_REVIEW: "NOT_DISPUTED",
  FILING: "UNDER_REVIEW",
};

function Stepper({ stage }: { stage: DisputeStage }) {
  const currentIdx = STAGE_ORDER.indexOf(stage);
  return (
    <div className="flex items-center mb-6">
      {STAGE_ORDER.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full border-2 ${
                  active
                    ? "bg-forest-600 border-forest-600"
                    : done
                    ? "bg-forest-300 border-forest-300"
                    : "bg-white border-forest-900/20"
                }`}
              />
              <span
                className={`text-[11px] mt-1.5 text-center whitespace-nowrap ${
                  active ? "text-forest-700 font-semibold" : "text-forest-900/40"
                }`}
              >
                {STAGE_LABELS[s]}
              </span>
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${done ? "bg-forest-300" : "bg-forest-900/10"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DisputeDrawer({
  deduction,
  onClose,
  onUpdated,
}: {
  deduction: Deduction;
  onClose: () => void;
  onUpdated: (d: Deduction) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveredInput, setRecoveredInput] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    setError(null);
    setRecoveredInput("");
    setReopenReason("");
  }, [deduction.sourceId]);

  const stage = deduction.dispute?.stage ?? "NOT_DISPUTED";

  async function run(fn: () => Promise<Deduction>) {
    setBusy(true);
    setError(null);
    try {
      const updated = await fn();
      onUpdated(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-forest-900/20" onClick={onClose} />
      <div className="relative w-full max-w-md bg-paper h-full overflow-y-auto shadow-xl border-l border-forest-900/10 p-6">
        <div className="flex items-start justify-between mb-1">
          <h2 className="font-display text-lg font-semibold text-forest-900">
            {deduction.retailerName ?? deduction.retailerNameRaw ?? "Unknown retailer"}
          </h2>
          <button onClick={onClose} className="text-forest-900/40 hover:text-forest-900 text-sm">
            Close
          </button>
        </div>
        <p className="text-sm text-forest-900/50 mb-5 font-mono">{deduction.invoiceNumber ?? "no invoice #"}</p>

        <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
          <div>
            <p className="text-forest-900/40 text-xs">Amount</p>
            <p className="font-mono font-medium">{formatCurrency(deduction.amount)}</p>
          </div>
          <div>
            <p className="text-forest-900/40 text-xs">Deducted</p>
            <p className="font-mono">{deduction.deductedAt ?? "—"}</p>
          </div>
          <div>
            <p className="text-forest-900/40 text-xs">Reason</p>
            <p>{deduction.reasonLabel ?? deduction.reasonRaw ?? "—"}</p>
          </div>
          <div>
            <p className="text-forest-900/40 text-xs">Category</p>
            <p>{deduction.reasonCategory ?? "—"}</p>
          </div>
        </div>

        {deduction.flags.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-forest-900/40 mb-1.5">Data quality flags</p>
            <div className="flex flex-wrap gap-1">
              {deduction.flags.map((f) => (
                <FlagBadge key={f} flag={f} />
              ))}
            </div>
          </div>
        )}

        <Stepper stage={stage} />

        {error && (
          <div className="mb-4 text-sm text-clay-600 bg-clay-100 border border-clay-400/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {stage === "NOT_DISPUTED" && (
            <button
              disabled={busy}
              onClick={() => run(() => api.startDispute(deduction.sourceId))}
              className="w-full bg-forest-600 text-white rounded-md py-2 text-sm font-medium hover:bg-forest-700 disabled:opacity-50"
            >
              Start dispute
            </button>
          )}

          {(stage === "UNDER_REVIEW" || stage === "FILING") && (
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={() => run(() => api.transition(deduction.dispute!.id, BACK_STAGE[stage]!))}
                className="flex-1 border border-forest-900/20 rounded-md py-2 text-sm font-medium hover:bg-forest-50 disabled:opacity-50"
              >
                Back to {STAGE_LABELS[BACK_STAGE[stage]!]}
              </button>
              <button
                disabled={busy}
                onClick={() => run(() => api.transition(deduction.dispute!.id, NEXT_STAGE[stage]!))}
                className="flex-1 bg-forest-600 text-white rounded-md py-2 text-sm font-medium hover:bg-forest-700 disabled:opacity-50"
              >
                Move to {STAGE_LABELS[NEXT_STAGE[stage]!]}
              </button>
            </div>
          )}

          {stage === "FILED" && (
            <div className="border border-forest-900/15 rounded-md p-3">
              <p className="text-sm font-medium mb-2">Resolve this dispute</p>
              <label className="text-xs text-forest-900/50">Recovered amount (0 if denied)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={deduction.amount ?? undefined}
                value={recoveredInput}
                onChange={(e) => setRecoveredInput(e.target.value)}
                placeholder="0.00"
                className="w-full border border-forest-900/20 rounded-md px-3 py-1.5 text-sm font-mono mt-1 mb-3 focus:outline-none focus:ring-2 focus:ring-forest-500/40"
              />
              <button
                disabled={busy || recoveredInput === ""}
                onClick={() =>
                  run(() =>
                    api.transition(deduction.dispute!.id, "RESOLVED", Number(recoveredInput))
                  )
                }
                className="w-full bg-forest-600 text-white rounded-md py-2 text-sm font-medium hover:bg-forest-700 disabled:opacity-50"
              >
                Mark resolved
              </button>
            </div>
          )}

          {stage === "RESOLVED" && (
            <div className="border border-forest-900/15 rounded-md p-3">
              <p className="text-sm font-medium mb-1">
                {deduction.dispute?.recoveryAmountKnown
                  ? `Recovered ${formatCurrency(deduction.dispute.recoveredAmount)} (${deduction.dispute.resolutionOutcome
                      ?.replace("_", " ")
                      .toLowerCase()})`
                  : "Resolved before recovery tracking existed — amount unknown"}
              </p>
              <label className="text-xs text-forest-900/50 mt-2 block">Reason to reopen</label>
              <input
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Retailer sent a corrected remittance"
                className="w-full border border-forest-900/20 rounded-md px-3 py-1.5 text-sm mt-1 mb-3 focus:outline-none focus:ring-2 focus:ring-forest-500/40"
              />
              <button
                disabled={busy || reopenReason.trim() === ""}
                onClick={() => run(() => api.reopen(deduction.dispute!.id, reopenReason))}
                className="w-full border border-forest-900/20 rounded-md py-2 text-sm font-medium hover:bg-forest-50 disabled:opacity-50"
              >
                Reopen dispute
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowRaw((v) => !v)}
          className="mt-6 text-xs text-forest-900/40 hover:text-forest-900/70 underline"
        >
          {showRaw ? "Hide" : "Show"} raw export record
        </button>
        {showRaw && (
          <pre className="mt-2 bg-forest-900/5 rounded-md p-3 text-[11px] overflow-x-auto text-forest-900/70">
            {JSON.stringify(deduction, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
