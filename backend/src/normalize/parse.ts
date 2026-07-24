/**
 * The export mixes at least 6 date shapes and represents amounts/booleans
 * as numbers, strings, and padded strings interchangeably. Each parser here
 * returns `null` on failure rather than throwing or guessing — an unparseable
 * value should become a visible flag upstream, not a silently wrong default.
 */

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Parses the export's date formats into an ISO 8601 date string, or null. */
export function parseDate(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    // Unix epoch seconds (10-digit range seen in the export, e.g. 1786752000)
    if (input > 1e8 && input < 1e11) {
      const d = new Date(input * 1000);
      if (!isNaN(d.getTime())) {
        return toIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      }
    }
    return null;
  }
  const raw = String(input).trim();
  if (raw.length === 0) return null;
  const lower = raw.toLowerCase();
  if (["null", "n/a", "na", "none", "-"].includes(lower)) return null;

  // 2026-01-05  or 2026/12/10 00:00:00
  let m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return toIso(+m[1], +m[2], +m[3]);

  // 18-05-2026 or 25-11-2026 (DD-MM-YYYY, since day > 12 disambiguates the export's usage)
  m = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return toIso(+m[3], +m[2], +m[1]);

  // 06/05/2026 or 2/23/26 or 3/14/26 (MM/DD/YYYY or MM/DD/YY)
  m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let year = +m[3];
    if (year < 100) year += 2000;
    return toIso(year, +m[1], +m[2]);
  }

  // September 3, 2026 / September 19, 2026
  m = raw.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const monthIdx = MONTHS.indexOf(m[1].toLowerCase());
    if (monthIdx >= 0) return toIso(+m[3], monthIdx + 1, +m[2]);
  }

  return null;
}

/** Parses amount fields that may arrive as numbers or padded/prefixed strings. */
export function parseAmount(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (isNaN(input)) return null;
    return input;
  }
  const raw = String(input).trim();
  if (raw.length === 0) return null;
  const lower = raw.toLowerCase();
  if (["null", "n/a", "na", "none"].includes(lower)) return null;
  const cleaned = raw.replace(/[$,]/g, "").trim();
  const n = Number(cleaned);
  if (isNaN(n)) return null;
  return n;
}

/** Coerces the export's assorted truthy/falsy representations to a real boolean. */
export function parseBoolean(input: unknown, fallback = false): boolean {
  if (typeof input === "boolean") return input;
  if (input === null || input === undefined) return fallback;
  if (typeof input === "number") return input !== 0;
  const s = String(input).trim().toLowerCase();
  if (["true", "1", "yes"].includes(s)) return true;
  if (["false", "0", "no"].includes(s)) return false;
  return fallback;
}
