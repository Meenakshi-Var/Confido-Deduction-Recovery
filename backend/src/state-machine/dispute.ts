/**
 * A deduction starts as just a fact from the retailer. An analyst decides
 * whether it's worth disputing, and if so, it moves through a small number
 * of stages until it's resolved one way or another.
 *
 * This is modeled as an explicit state machine rather than a free-text
 * `status` string (which is exactly what the raw export is, and exactly
 * why it's full of "Complete" / "COMPLETE" / "dispute" / "Dispute - Filed"
 * inconsistencies). Transitions are only legal along the edges below, and
 * resolving requires a recovered amount so recovery can never be a
 * guess bolted on after the fact.
 */

export type DisputeStage =
  | "NOT_DISPUTED" // default state a deduction starts in; analyst hasn't acted
  | "UNDER_REVIEW" // analyst is deciding / gathering documentation
  | "FILING" // dispute drafted, not yet sent to retailer
  | "FILED" // sent to retailer, awaiting their response
  | "RESOLVED"; // retailer has responded; terminal

export type ResolutionOutcome = "RECOVERED_FULL" | "RECOVERED_PARTIAL" | "DENIED";

export const STAGE_ORDER: DisputeStage[] = [
  "NOT_DISPUTED",
  "UNDER_REVIEW",
  "FILING",
  "FILED",
  "RESOLVED",
];

const FORWARD_EDGES: Record<DisputeStage, DisputeStage[]> = {
  NOT_DISPUTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["FILING", "NOT_DISPUTED"], // analyst can decide not to pursue it after all
  FILING: ["FILED", "UNDER_REVIEW"],
  FILED: ["RESOLVED"],
  RESOLVED: [], // terminal; reopening is a distinct, explicit action below
};

export interface TransitionInput {
  from: DisputeStage;
  to: DisputeStage;
  recoveredAmount?: number | null;
  deductionAmount: number;
  reason?: string;
}

export interface TransitionResult {
  ok: boolean;
  error?: string;
}

/**
 * Validates a proposed stage transition. Does not mutate anything — callers
 * apply the transition only if `ok` is true, so guardrails can't be bypassed
 * by calling the DB layer directly.
 */
export function validateTransition(input: TransitionInput): TransitionResult {
  const { from, to, recoveredAmount, deductionAmount } = input;

  if (from === to) {
    return { ok: false, error: `Already in stage ${from}.` };
  }

  if (!FORWARD_EDGES[from].includes(to)) {
    return {
      ok: false,
      error: `Cannot move from ${from} to ${to}. Allowed next stages: ${
        FORWARD_EDGES[from].join(", ") || "none (terminal)"
      }.`,
    };
  }

  if (to === "RESOLVED") {
    if (recoveredAmount === null || recoveredAmount === undefined) {
      return { ok: false, error: "Resolving a dispute requires a recovered amount (0 if denied)." };
    }
    if (recoveredAmount < 0) {
      return { ok: false, error: "Recovered amount cannot be negative." };
    }
    if (recoveredAmount > deductionAmount) {
      return {
        ok: false,
        error: `Recovered amount ($${recoveredAmount}) cannot exceed the deduction amount ($${deductionAmount}).`,
      };
    }
  }

  return { ok: true };
}

/** Reopening a resolved dispute is allowed, but only as an explicit, reason-required action. */
export function validateReopen(reason?: string): TransitionResult {
  if (!reason || reason.trim().length === 0) {
    return { ok: false, error: "Reopening a resolved dispute requires a reason." };
  }
  return { ok: true };
}

export function resolutionOutcome(recoveredAmount: number, deductionAmount: number): ResolutionOutcome {
  if (recoveredAmount <= 0) return "DENIED";
  if (recoveredAmount >= deductionAmount) return "RECOVERED_FULL";
  return "RECOVERED_PARTIAL";
}

/** Maps the export's free-text historical statuses onto the canonical stage they represent. */
export function mapLegacyStatus(statusRaw: string | null): DisputeStage {
  if (!statusRaw) return "NOT_DISPUTED";
  const s = statusRaw.trim().toLowerCase();
  if (s === "open") return "NOT_DISPUTED";
  if (s === "send to ops" || s === "in review") return "UNDER_REVIEW";
  if (s.startsWith("dispute - filing")) return "FILING";
  if (s.startsWith("dispute - filed") || s === "dispute") return "FILED";
  if (s === "complete") return "RESOLVED";
  return "NOT_DISPUTED";
}
