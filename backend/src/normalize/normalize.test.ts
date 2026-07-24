import { test } from "node:test";
import assert from "node:assert/strict";
import { matchReason, matchRetailer } from "./match";
import { normalizeAll, normalizeOne, Company } from "./normalize";
import retailers from "../../data/retailers.json";
import reasons from "../../data/dispute_reasons.json";

const companies: Company[] = [
  { id: 1, name: "Cascade Snacks Co.", slug: "cascade-snacks", erp_system: "NetSuite", default_currency: "USD", is_active: true },
  { id: 2, name: "Northfield Beverage", slug: "northfield-bev", erp_system: "QuickBooks Online", default_currency: "USD", is_active: true },
];
const ctx = { companies, retailers, reasons };

test("matchRetailer: resolves the export's real spelling variants to one canonical id", () => {
  const kehe = retailers.find((r) => r.name === "KeHE")!.id;
  assert.equal(matchRetailer("KEHE\t", retailers).id, kehe);
  assert.equal(matchRetailer("  KeHE", retailers).id, kehe);
  assert.equal(matchRetailer("K e H E", retailers).id, kehe);
  assert.equal(matchRetailer("KeHE Distributors LLC", retailers).id, kehe);
  assert.equal(matchRetailer("kehe food distributors", retailers).id, kehe);

  const gfc = retailers.find((r) => r.name === "Gordon Food Service")!.id;
  assert.equal(matchRetailer("GFC", retailers).id, gfc);

  const unfi = retailers.find((r) => r.name === "UNFI")!.id;
  assert.equal(matchRetailer("United Natural Foods", retailers).id, unfi);
  assert.equal(matchRetailer("U.N.F.I.", retailers).id, unfi);
});

test("matchRetailer: unrecognized or empty names resolve to null rather than a wrong guess", () => {
  assert.equal(matchRetailer("N/A", retailers).id, null);
  assert.equal(matchRetailer(null, retailers).id, null);
  assert.equal(matchRetailer("Some Regional Grocer Nobody Has Heard Of", retailers).id, null);
});

test("matchReason: maps free-text reasons to canonical codes, including near-misses", () => {
  assert.equal(matchReason("Price Discrepancy", reasons).code, "PRICE");
  assert.equal(matchReason("unsaleables", reasons).code, "UNSAL");
  assert.equal(matchReason("Bill Back", reasons).code, "MCB");
  assert.equal(matchReason("frieght", reasons).code, "FREIGHT"); // misspelling in the export
  assert.equal(matchReason("Misc", reasons).code, null); // genuinely ambiguous, not a false match
});

test("normalizeOne: flags an unknown company_id instead of dropping the record", () => {
  const result = normalizeOne(
    { id: 1, company_id: 3, retailer_name: "BJs", reason: "Price Discrepancy", amount: 2.6 },
    ctx,
    0
  );
  assert.ok(result.flags.includes("UNKNOWN_COMPANY"));
  assert.equal(result.companyId, 3); // preserved for visibility, just flagged
});

test("normalizeOne: negative amounts are flagged and corrected to their absolute value", () => {
  const result = normalizeOne({ id: 2, company_id: 1, amount: -74.26 }, ctx, 1);
  assert.ok(result.flags.includes("NEGATIVE_AMOUNT"));
  assert.equal(result.amount, 74.26);
});

test("normalizeOne: conflicting amount/total_amount fields are flagged, not silently merged", () => {
  const result = normalizeOne(
    { id: 3, company_id: 1, amount: 10, total_amount: -74.26 },
    ctx,
    2
  );
  assert.ok(result.flags.includes("CONFLICTING_AMOUNT_FIELDS"));
});

test("normalizeAll: a repeated id is flagged as DUPLICATE_ID on every occurrence", () => {
  const result = normalizeAll(
    [
      { id: 42, company_id: 1, amount: 1 },
      { id: 42, company_id: 1, amount: 2 },
    ],
    ctx
  );
  assert.ok(result[0].flags.includes("DUPLICATE_ID"));
  assert.ok(result[1].flags.includes("DUPLICATE_ID"));
});

test("normalizeAll: flags a date year that's an outlier relative to the rest of the batch", () => {
  const rows = [
    { id: 1, company_id: 1, amount: 1, deducted_at: "2026-01-01" },
    { id: 2, company_id: 1, amount: 1, deducted_at: "2026-02-01" },
    { id: 3, company_id: 1, amount: 1, deducted_at: "2026-03-01" },
    { id: 4, company_id: 1, amount: 1, deducted_at: "2028-12-21" }, // the odd one out
  ];
  const result = normalizeAll(rows, ctx);
  assert.ok(!result[0].flags.includes("FUTURE_DATE"));
  assert.ok(!result[1].flags.includes("FUTURE_DATE"));
  assert.ok(!result[2].flags.includes("FUTURE_DATE"));
  assert.ok(result[3].flags.includes("FUTURE_DATE"));
});

test("normalizeOne: a fully missing id gets a synthetic id and a flag, never crashes", () => {
  const result = normalizeOne({ company_id: 1, amount: 5 }, ctx, 7);
  assert.equal(result.sourceId, "synth-7");
  assert.ok(result.flags.includes("MISSING_ID"));
});
