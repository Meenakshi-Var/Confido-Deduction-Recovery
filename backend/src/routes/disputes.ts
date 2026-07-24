import { Router } from "express";
import { getDb } from "../db/client";
import { getDeduction, getDeductionAmount } from "./deductions.query";
import {
  validateTransition,
  validateReopen,
  resolutionOutcome,
  DisputeStage,
} from "../state-machine/dispute";

export const disputesRouter = Router();

function nowIso() {
  return new Date().toISOString();
}

/** Starts a dispute: NOT_DISPUTED -> UNDER_REVIEW. Idempotent-ish: 409 if one already exists. */
disputesRouter.post("/deductions/:sourceId/dispute", (req, res) => {
  const deduction = getDeduction(req.params.sourceId);
  if (!deduction) return res.status(404).json({ error: "Deduction not found." });
  if (deduction.dispute) {
    return res.status(409).json({ error: "This deduction already has a dispute in progress." });
  }

  const check = validateTransition({
    from: "NOT_DISPUTED",
    to: "UNDER_REVIEW",
    deductionAmount: deduction.amount ?? 0,
  });
  if (!check.ok) return res.status(422).json({ error: check.error });

  const db = getDb();
  const now = nowIso();
  const result = db
    .prepare(
      `INSERT INTO disputes (deduction_source_id, stage, recovered_amount, recovery_amount_known, resolution_outcome, created_at, updated_at)
       VALUES (?, 'UNDER_REVIEW', NULL, 0, NULL, ?, ?)`
    )
    .run(deduction.sourceId, now, now);
  db.prepare(
    `INSERT INTO dispute_events (dispute_id, from_stage, to_stage, note, recovered_amount, created_at)
     VALUES (?, 'NOT_DISPUTED', 'UNDER_REVIEW', ?, NULL, ?)`
  ).run(result.lastInsertRowid, req.body?.note ?? null, now);

  res.status(201).json(getDeduction(deduction.sourceId));
});

/** Moves a dispute forward (or back one step) along its legal edges. */
disputesRouter.patch("/disputes/:id/transition", (req, res) => {
  const disputeId = Number(req.params.id);
  const { toStage, recoveredAmount, note } = req.body as {
    toStage: DisputeStage;
    recoveredAmount?: number;
    note?: string;
  };

  const db = getDb();
  const dispute = db.prepare(`SELECT * FROM disputes WHERE id = ?`).get(disputeId) as any;
  if (!dispute) return res.status(404).json({ error: "Dispute not found." });

  const deductionAmount = getDeductionAmount(dispute.deduction_source_id);
  const check = validateTransition({
    from: dispute.stage,
    to: toStage,
    recoveredAmount,
    deductionAmount,
  });
  if (!check.ok) return res.status(422).json({ error: check.error });

  const now = nowIso();
  const isResolving = toStage === "RESOLVED";
  const outcome = isResolving ? resolutionOutcome(recoveredAmount!, deductionAmount) : null;

  db.prepare(
    `UPDATE disputes SET stage = ?, recovered_amount = ?, recovery_amount_known = ?, resolution_outcome = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    toStage,
    isResolving ? recoveredAmount : dispute.recovered_amount,
    isResolving ? 1 : dispute.recovery_amount_known,
    outcome,
    now,
    disputeId
  );
  db.prepare(
    `INSERT INTO dispute_events (dispute_id, from_stage, to_stage, note, recovered_amount, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(disputeId, dispute.stage, toStage, note ?? null, isResolving ? recoveredAmount : null, now);

  res.json(getDeduction(dispute.deduction_source_id));
});

/** Reopens a RESOLVED dispute back to FILED. Requires a reason; goes through the audit trail. */
disputesRouter.post("/disputes/:id/reopen", (req, res) => {
  const disputeId = Number(req.params.id);
  const { reason } = req.body as { reason?: string };

  const check = validateReopen(reason);
  if (!check.ok) return res.status(422).json({ error: check.error });

  const db = getDb();
  const dispute = db.prepare(`SELECT * FROM disputes WHERE id = ?`).get(disputeId) as any;
  if (!dispute) return res.status(404).json({ error: "Dispute not found." });
  if (dispute.stage !== "RESOLVED") {
    return res.status(422).json({ error: "Only a RESOLVED dispute can be reopened." });
  }

  const now = nowIso();
  db.prepare(
    `UPDATE disputes SET stage = 'FILED', resolution_outcome = NULL, updated_at = ? WHERE id = ?`
  ).run(now, disputeId);
  db.prepare(
    `INSERT INTO dispute_events (dispute_id, from_stage, to_stage, note, recovered_amount, created_at)
     VALUES (?, 'RESOLVED', 'FILED', ?, NULL, ?)`
  ).run(disputeId, `Reopened: ${reason}`, now);

  res.json(getDeduction(dispute.deduction_source_id));
});

disputesRouter.get("/disputes/:id/events", (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM dispute_events WHERE dispute_id = ? ORDER BY created_at ASC, id ASC`)
    .all(Number(req.params.id));
  res.json(rows);
});
