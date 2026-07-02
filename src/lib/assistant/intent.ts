/**
 * Intent + numeric-constraint parsing for the real-estate assistant chat.
 *
 * Deliberately separate from smart-search.ts: smart-search extracts
 * *categorical* filters (district/project/type/bedrooms/status/sequence).
 * This module extracts *what the user wants done* (intent) and *numeric
 * thresholds* (price/yield/size ranges) — smart-search then runs on the
 * same raw query to fill in the categorical side. The two compose in
 * query-engine.ts.
 *
 * Pure, dependency-free, easily unit-testable.
 */

export type AssistantIntent =
  | "recommend"   // "what should I buy", "best investment"
  | "trend"       // "what's trending", "surging projects"
  | "cheapest"    // "cheapest studio in Yas Island"
  | "expensive"   // "most expensive villa in Saadiyat"
  | "average"     // "average price of 2BR in Al Reem Island"
  | "count"       // "how many transactions in Yas Island"
  | "find";       // default — "show me 2BR apartments in Al Reem Island"

const INTENT_KEYWORDS: Array<{ intent: AssistantIntent; patterns: RegExp[] }> = [
  {
    intent: "recommend",
    patterns: [
      /\brecommend/i,
      /\bwhat should i buy/i,
      /\bbest investment/i,
      /\bbest deal/i,
      /\bbest opportunit/i,
      /\bshould i buy/i,
      /\bgood investment/i,
      /\btop pick/i,
      /\bwhere to invest/i,
    ],
  },
  {
    intent: "trend",
    patterns: [
      /\btrending/i,
      /\btrend\b/i,
      /\bsurging/i,
      /\bmomentum/i,
      /\bhot project/i,
      /\bmost active/i,
      /\baccelerating/i,
    ],
  },
  {
    intent: "cheapest",
    patterns: [
      /\bcheapest/i,
      /\blowest price/i,
      /\bmost affordable/i,
      /\bleast expensive/i,
      /\bcheap(?:est)? deal/i,
    ],
  },
  {
    intent: "expensive",
    patterns: [
      /\bmost expensive/i,
      /\bhighest price/i,
      /\bpriciest/i,
      /\bmost costly/i,
    ],
  },
  {
    intent: "average",
    patterns: [
      /\baverage\b/i,
      /\bmedian\b/i,
      /\btypical price/i,
      /\bhow much does/i,
      /\bwhat'?s the price/i,
    ],
  },
  {
    intent: "count",
    patterns: [
      /\bhow many\b/i,
      /\bcount of\b/i,
      /\bnumber of\b/i,
    ],
  },
];

export function detectIntent(query: string): AssistantIntent {
  for (const { intent, patterns } of INTENT_KEYWORDS) {
    if (patterns.some((p) => p.test(query))) return intent;
  }
  return "find";
}

// --- numeric constraint parsing --------------------------------------------

export interface AssistantConstraints {
  priceMin?: number;
  priceMax?: number;
  yieldMin?: number;
  yieldMax?: number;
  sizeMin?: number;
  sizeMax?: number;
}

/**
 * Parse "1.5m" / "1.5 million" / "800k" / "1,200,000" / "900" into a number.
 * Bare numbers ≥ 1000 with no suffix are treated as AED directly (e.g.
 * "under 900000"); bare numbers < 1000 with no suffix are almost never a
 * sane AED price, but we still return them as-is — callers decide context.
 */
function parseMoneyToken(numStr: string, suffix: string | undefined): number {
  const n = parseFloat(numStr.replace(/,/g, ""));
  if (Number.isNaN(n)) return NaN;
  const s = (suffix || "").toLowerCase();
  if (s === "m" || s === "million" || s === "mil") return n * 1_000_000;
  if (s === "k" || s === "thousand") return n * 1_000;
  return n;
}

const MONEY = /(?:aed\s*)?(\d[\d,]*\.?\d*)\s*(million|mil|thousand|m|k)?\b/i;

/**
 * Extracts price constraints. Handles:
 *   "under 1.5m" / "below 900k" / "less than 2 million"       → priceMax
 *   "over 800k" / "above 1.2m" / "more than 500000"           → priceMin
 *   "between 1m and 2m"                                        → both
 */
function parsePriceConstraints(query: string): { priceMin?: number; priceMax?: number } {
  const between = query.match(
    new RegExp(`\\bbetween\\s+${MONEY.source}\\s+and\\s+${MONEY.source}`, "i")
  );
  if (between) {
    const a = parseMoneyToken(between[1], between[2]);
    const b = parseMoneyToken(between[3], between[4]);
    if (!Number.isNaN(a) && !Number.isNaN(b)) {
      return { priceMin: Math.min(a, b), priceMax: Math.max(a, b) };
    }
  }

  const out: { priceMin?: number; priceMax?: number } = {};

  const maxMatch = query.match(
    new RegExp(`\\b(?:under|below|less than|cheaper than|<)\\s*${MONEY.source}`, "i")
  );
  if (maxMatch) {
    const v = parseMoneyToken(maxMatch[1], maxMatch[2]);
    if (!Number.isNaN(v)) out.priceMax = v;
  }

  const minMatch = query.match(
    new RegExp(`\\b(?:over|above|more than|greater than|>)\\s*${MONEY.source}`, "i")
  );
  if (minMatch) {
    const v = parseMoneyToken(minMatch[1], minMatch[2]);
    if (!Number.isNaN(v)) out.priceMin = v;
  }

  return out;
}

/**
 * Extracts a rental-yield constraint, e.g.:
 *   "yield above 7%" / "yield over 7%" / "yield > 7%" / "7%+ yield"
 *   "yield below 5%" / "yield under 5%"
 */
function parseYieldConstraints(query: string): { yieldMin?: number; yieldMax?: number } {
  const out: { yieldMin?: number; yieldMax?: number } = {};

  const minMatch = query.match(
    /\byield\s*(?:of\s*)?(?:above|over|more than|greater than|at least|>=?)\s*(\d+(?:\.\d+)?)\s*%/i
  ) || query.match(/(\d+(?:\.\d+)?)\s*%\+?\s*(?:\+\s*)?yield/i);
  if (minMatch) {
    const v = parseFloat(minMatch[1]);
    if (!Number.isNaN(v)) out.yieldMin = v;
  }

  const maxMatch = query.match(
    /\byield\s*(?:of\s*)?(?:below|under|less than|at most|<=?)\s*(\d+(?:\.\d+)?)\s*%/i
  );
  if (maxMatch) {
    const v = parseFloat(maxMatch[1]);
    if (!Number.isNaN(v)) out.yieldMax = v;
  }

  return out;
}

/**
 * Extracts a size constraint in sqft, e.g. "over 1000 sqft", "under 900 sq ft".
 */
function parseSizeConstraints(query: string): { sizeMin?: number; sizeMax?: number } {
  const out: { sizeMin?: number; sizeMax?: number } = {};

  const maxMatch = query.match(
    /\b(?:under|below|less than|smaller than)\s*(\d[\d,]*)\s*sq\s*\.?\s*ft/i
  );
  if (maxMatch) out.sizeMax = parseFloat(maxMatch[1].replace(/,/g, ""));

  const minMatch = query.match(
    /\b(?:over|above|more than|bigger than|at least)\s*(\d[\d,]*)\s*sq\s*\.?\s*ft/i
  );
  if (minMatch) out.sizeMin = parseFloat(minMatch[1].replace(/,/g, ""));

  return out;
}

export function parseConstraints(query: string): AssistantConstraints {
  return {
    ...parsePriceConstraints(query),
    ...parseYieldConstraints(query),
    ...parseSizeConstraints(query),
  };
}
