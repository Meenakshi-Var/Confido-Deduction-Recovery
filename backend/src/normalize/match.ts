/**
 * The export spells retailer/reason names in every case imaginable
 * ("KEHE\t", "K e H E", "kehe distributors llc", "GFC" for Gordon Food Service).
 * Rather than hardcode every alias, we normalize aggressively (strip whitespace/
 * punctuation, lowercase, collapse letter-spacing) and match on containment
 * against the canonical name, plus a small, explicit alias table for the
 * abbreviations/legal-suffix cases that containment can't catch.
 */

export function cleanToken(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const s = String(input)
    .replace(/[\u0000-\u001f]/g, " ") // control chars incl. tabs/newlines
    .trim();
  if (s.length === 0) return null;
  const lower = s.toLowerCase();
  if (["null", "n/a", "na", "none", "-", "???", "unknown"].includes(lower)) return null;
  return s;
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.&']/g, "")
    .replace(/\binc\b|\bllc\b|\bcorp(oration)?\b|\bco\b|\bthe\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const RETAILER_ALIASES: Record<string, string> = {
  kehe: "kehe",
  "k e h e": "kehe",
  gfc: "gordon food service",
  unfi: "unfi",
  "u n f i": "unfi",
  "united natural foods": "unfi",
  "united natural foods inc": "unfi",
  tgt: "target",
  heb: "h e b",
  "amazon vendor": "amazon",
  "amazon vendor central": "amazon",
  "amazon com": "amazon",
  dotfoods: "dot foods",
  bjs: "bj s wholesale club",
};

export interface Retailer {
  id: number;
  name: string;
  type: string;
  region: string;
}

export function matchRetailer(
  rawName: string | null,
  retailers: Retailer[]
): { id: number | null } {
  if (!rawName) return { id: null };
  let s = slug(rawName);
  if (s.length === 0) return { id: null };
  s = RETAILER_ALIASES[s] ?? s;

  for (const r of retailers) {
    const canonical = slug(r.name);
    if (canonical === s) return { id: r.id };
  }
  // containment both ways handles "gordon food service" vs "gordon food service gfc"
  for (const r of retailers) {
    const canonical = slug(r.name);
    if (canonical.length >= 3 && (s.includes(canonical) || canonical.includes(s))) {
      return { id: r.id };
    }
  }
  return { id: null };
}

const REASON_ALIASES: Record<string, string> = {
  short: "SHORT",
  shortage: "SHORT",
  "shortage in transit": "SHORT",
  "shortage product": "SHORT",
  price: "PRICE",
  pricing: "PRICE",
  "price discrepancy": "PRICE",
  freight: "FREIGHT",
  frieght: "FREIGHT",
  "freight allowance": "FREIGHT",
  "os d": "OSD",
  osd: "OSD",
  compliance: "COMP",
  "compliance fine": "COMP",
  fine: "COMP",
  spoilage: "SPOIL",
  spoiled: "SPOIL",
  unsaleables: "UNSAL",
  unsaleable: "UNSAL",
  unsalables: "UNSAL",
  "bill back": "MCB",
  billback: "MCB",
  mcb: "MCB",
  promo: "PROMO",
  "promotional allowance": "PROMO",
  misc: null as unknown as string,
  other: null as unknown as string,
};

export interface DisputeReason {
  code: string;
  label: string;
  category: string;
  typically_disputable: boolean;
}

export function matchReason(
  rawReason: string | null,
  reasons: DisputeReason[]
): { code: string | null } {
  if (!rawReason) return { code: null };
  const s = slug(rawReason);
  if (s.length === 0) return { code: null };
  if (s in REASON_ALIASES) return { code: REASON_ALIASES[s] ?? null };
  for (const r of reasons) {
    if (slug(r.label) === s || r.code.toLowerCase() === s) return { code: r.code };
  }
  return { code: null };
}
