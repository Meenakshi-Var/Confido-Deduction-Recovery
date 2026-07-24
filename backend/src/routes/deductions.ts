import { Router } from "express";
import { getDb } from "../db/client";
import { listDeductions, getDeduction } from "./deductions.query";

export const deductionsRouter = Router();

deductionsRouter.get("/companies", (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare(`SELECT id, name, is_active FROM companies ORDER BY name`)
    .all();
  res.json(rows.map((r: any) => ({ id: r.id, name: r.name, isActive: !!r.is_active })));
});

deductionsRouter.get("/deductions", (req, res) => {
  const companyId = Number(req.query.companyId);
  if (!companyId || isNaN(companyId)) {
    return res.status(400).json({ error: "companyId query parameter is required." });
  }
  const includeDeleted = req.query.includeDeleted === "true";
  res.json(listDeductions(companyId, includeDeleted));
});

deductionsRouter.get("/deductions/:sourceId", (req, res) => {
  const deduction = getDeduction(req.params.sourceId);
  if (!deduction) return res.status(404).json({ error: "Not found." });
  res.json(deduction);
});
