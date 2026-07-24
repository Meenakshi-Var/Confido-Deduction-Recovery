import { Router } from "express";
import { getDb } from "../db/client";

export const recoveryRouter = Router();

/**
 * "Recovered" only means something once a dispute is RESOLVED with a known
 * amount - a retailer agreeing to a dispute doesn't guarantee they pay back
 * all of it. The recovery rate below is computed only over disputes where
 * the recovered amount is actually known, and the count/amount of disputes
 * still missing that data is surfaced separately rather than folded in as
 * an implicit zero (which would understate recovery) or full credit (which
 * would overstate it).
 */
recoveryRouter.get("/recovery/summary", (req, res) => {
  const companyId = Number(req.query.companyId);
  if (!companyId || isNaN(companyId)) {
    return res.status(400).json({ error: "companyId query parameter is required." });
  }
  const db = getDb();

  const overall = db
    .prepare(
      `SELECT
         COUNT(*) FILTER (WHERE disp.id IS NOT NULL) AS dispute_count,
         COALESCE(SUM(d.amount) FILTER (WHERE disp.id IS NOT NULL), 0) AS disputed_amount,
         COUNT(*) FILTER (WHERE disp.recovery_amount_known = 1) AS known_recovery_count,
         COALESCE(SUM(d.amount) FILTER (WHERE disp.recovery_amount_known = 1), 0) AS known_recovery_disputed_amount,
         COALESCE(SUM(disp.recovered_amount) FILTER (WHERE disp.recovery_amount_known = 1), 0) AS recovered_amount,
         COUNT(*) FILTER (WHERE disp.stage = 'RESOLVED' AND disp.recovery_amount_known = 0) AS unknown_recovery_count
       FROM deductions d
       LEFT JOIN disputes disp ON disp.deduction_source_id = d.source_id
       WHERE d.company_id = ? AND d.is_deleted = 0`
    )
    .get(companyId) as any;

  const byStage = db
    .prepare(
      `SELECT disp.stage AS stage, COUNT(*) AS count, COALESCE(SUM(d.amount), 0) AS amount
       FROM disputes disp
       JOIN deductions d ON d.source_id = disp.deduction_source_id
       WHERE d.company_id = ? AND d.is_deleted = 0
       GROUP BY disp.stage`
    )
    .all(companyId);

  const byRetailer = db
    .prepare(
      `SELECT
         COALESCE(r.name, d.retailer_name_raw, 'Unrecognized retailer') AS retailer_name,
         COUNT(*) FILTER (WHERE disp.id IS NOT NULL) AS dispute_count,
         COALESCE(SUM(d.amount) FILTER (WHERE disp.id IS NOT NULL), 0) AS disputed_amount,
         COALESCE(SUM(d.amount) FILTER (WHERE disp.recovery_amount_known = 1), 0) AS known_recovery_disputed_amount,
         COALESCE(SUM(disp.recovered_amount) FILTER (WHERE disp.recovery_amount_known = 1), 0) AS recovered_amount
       FROM deductions d
       LEFT JOIN retailers r ON r.id = d.retailer_id
       LEFT JOIN disputes disp ON disp.deduction_source_id = d.source_id
       WHERE d.company_id = ? AND d.is_deleted = 0 AND disp.id IS NOT NULL
       GROUP BY retailer_name
       ORDER BY disputed_amount DESC`
    )
    .all(companyId) as any[];

  const recoveryRate =
    overall.known_recovery_disputed_amount > 0
      ? overall.recovered_amount / overall.known_recovery_disputed_amount
      : null;

  res.json({
    disputeCount: overall.dispute_count,
    disputedAmount: overall.disputed_amount,
    recoveredAmount: overall.recovered_amount,
    knownRecoveryDisputedAmount: overall.known_recovery_disputed_amount,
    recoveryRate,
    unknownRecoveryCount: overall.unknown_recovery_count,
    byStage: byStage.map((r: any) => ({ stage: r.stage, count: r.count, amount: r.amount })),
    byRetailer: byRetailer.map((r) => ({
      retailerName: r.retailer_name,
      disputeCount: r.dispute_count,
      disputedAmount: r.disputed_amount,
      recoveredAmount: r.recovered_amount,
      recoveryRate:
        r.known_recovery_disputed_amount > 0
          ? r.recovered_amount / r.known_recovery_disputed_amount
          : null,
    })),
  });
});
