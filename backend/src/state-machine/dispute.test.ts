import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateTransition,
  validateReopen,
  resolutionOutcome,
  mapLegacyStatus,
  canStartDispute,
} from "./dispute";

test("canStartDispute: allows restarting from an existing NOT_DISPUTED dispute row", () => {
  assert.equal(canStartDispute(null).ok, true);
  assert.equal(canStartDispute({ stage: "NOT_DISPUTED" }).ok, true);
  assert.equal(canStartDispute({ stage: "UNDER_REVIEW" }).ok, false);
});

test("validateTransition: allows the legal forward path", () => {
  assert.equal(validateTransition({ from: "NOT_DISPUTED", to: "UNDER_REVIEW", deductionAmount: 100 }).ok, true);
  assert.equal(validateTransition({ from: "UNDER_REVIEW", to: "FILING", deductionAmount: 100 }).ok, true);
  assert.equal(validateTransition({ from: "FILING", to: "FILED", deductionAmount: 100 }).ok, true);
});

test("validateTransition: rejects skipping stages", () => {
  const result = validateTransition({ from: "NOT_DISPUTED", to: "FILED", deductionAmount: 100 });
  assert.equal(result.ok, false);
  assert.match(result.error!, /Cannot move/);
});

test("validateTransition: rejects moving off a terminal RESOLVED stage", () => {
  const result = validateTransition({ from: "RESOLVED", to: "FILED", deductionAmount: 100 });
  assert.equal(result.ok, false);
});

test("validateTransition: resolving without a recovered amount is rejected", () => {
  const result = validateTransition({ from: "FILED", to: "RESOLVED", deductionAmount: 100 });
  assert.equal(result.ok, false);
  assert.match(result.error!, /recovered amount/);
});

test("validateTransition: recovered amount cannot exceed the deduction amount", () => {
  const result = validateTransition({
    from: "FILED",
    to: "RESOLVED",
    deductionAmount: 100,
    recoveredAmount: 150,
  });
  assert.equal(result.ok, false);
  assert.match(result.error!, /cannot exceed/);
});

test("validateTransition: a zero recovered amount is a valid denial", () => {
  const result = validateTransition({
    from: "FILED",
    to: "RESOLVED",
    deductionAmount: 100,
    recoveredAmount: 0,
  });
  assert.equal(result.ok, true);
});

test("validateReopen: requires a non-empty reason", () => {
  assert.equal(validateReopen("").ok, false);
  assert.equal(validateReopen(undefined).ok, false);
  assert.equal(validateReopen("Retailer sent a corrected remittance").ok, true);
});

test("resolutionOutcome: classifies full / partial / denied correctly", () => {
  assert.equal(resolutionOutcome(100, 100), "RECOVERED_FULL");
  assert.equal(resolutionOutcome(50, 100), "RECOVERED_PARTIAL");
  assert.equal(resolutionOutcome(0, 100), "DENIED");
});

test("mapLegacyStatus: maps the export's inconsistent free-text statuses to canonical stages", () => {
  assert.equal(mapLegacyStatus(null), "NOT_DISPUTED");
  assert.equal(mapLegacyStatus("Open"), "NOT_DISPUTED");
  assert.equal(mapLegacyStatus("Send to Ops"), "UNDER_REVIEW");
  assert.equal(mapLegacyStatus(" In Review "), "UNDER_REVIEW");
  assert.equal(mapLegacyStatus("Dispute - Filing in progress"), "FILING");
  assert.equal(mapLegacyStatus("dispute"), "FILED");
  assert.equal(mapLegacyStatus("Dispute - Filed"), "FILED");
  assert.equal(mapLegacyStatus("COMPLETE"), "RESOLVED");
});
