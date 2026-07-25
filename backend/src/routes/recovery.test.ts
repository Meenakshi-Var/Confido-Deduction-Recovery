import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeStageBuckets } from "./recovery";

test("normalizeStageBuckets: includes every stage in the canonical order, even when a bucket is empty", () => {
  const rows = [
    { stage: "UNDER_REVIEW", count: 2, amount: 150 },
    { stage: "FILED", count: 1, amount: 100 },
  ];

  const normalized = normalizeStageBuckets(rows);
  assert.deepEqual(normalized.map((r) => r.stage), [
    "NOT_DISPUTED",
    "UNDER_REVIEW",
    "FILING",
    "FILED",
    "RESOLVED",
  ]);
  assert.equal(normalized[0].count, 0);
  assert.equal(normalized[0].amount, 0);
  assert.equal(normalized[1].count, 2);
  assert.equal(normalized[1].amount, 150);
});
