import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAmount, parseBoolean, parseDate } from "./parse";

test("parseDate: handles the export's real date formats", () => {
  assert.equal(parseDate("2026-01-05"), "2026-01-05");
  assert.equal(parseDate("2026/12/10 00:00:00"), "2026-12-10");
  assert.equal(parseDate("18-05-2026"), "2026-05-18"); // DD-MM-YYYY
  assert.equal(parseDate("06/05/2026"), "2026-06-05"); // MM/DD/YYYY
  assert.equal(parseDate("3/14/26"), "2026-03-14"); // MM/DD/YY
  assert.equal(parseDate("September 3, 2026"), "2026-09-03");
  assert.equal(parseDate(1773273600), "2026-03-12"); // unix epoch seconds
});

test("parseDate: returns null instead of guessing on garbage input", () => {
  assert.equal(parseDate("null"), null);
  assert.equal(parseDate(""), null);
  assert.equal(parseDate("  "), null);
  assert.equal(parseDate(null), null);
  assert.equal(parseDate("not a date"), null);
});

test("parseDate: DD-MM vs MM-DD ambiguity is resolved by the export's own hyphen convention", () => {
  // The export never uses MM-DD-YYYY with hyphens (only slashes), and DD-MM-YYYY
  // rows with day > 12 prove the convention, e.g. 25-11-2026.
  assert.equal(parseDate("25-11-2026"), "2026-11-25");
});

test("parseAmount: strips currency formatting and padding", () => {
  assert.equal(parseAmount("  117.71  "), 117.71);
  assert.equal(parseAmount(2.6), 2.6);
  assert.equal(parseAmount("$1,234.50"), 1234.5);
});

test("parseAmount: returns null rather than 0 for missing/garbage values", () => {
  assert.equal(parseAmount(null), null);
  assert.equal(parseAmount("null"), null);
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount("n/a"), null);
});

test("parseBoolean: coerces the export's mixed boolean representations", () => {
  assert.equal(parseBoolean(true), true);
  assert.equal(parseBoolean("true"), true);
  assert.equal(parseBoolean(1), true);
  assert.equal(parseBoolean(0), false);
  assert.equal(parseBoolean("false"), false);
  assert.equal(parseBoolean(null, false), false);
});
