/**
 * Recommendation engine.
 *
 * Consumes CohortSignals from ./supply-demand.ts and produces ranked,
 * explainable recommendations. Rule-based for now — opportunity score is
 * a transparent weighted sum, and narrative bullets come from a handful
 * of template sentences. This is deliberately testable; ML goes in Phase 2.
 *
 * Score weights and badge thresholds are all exported constants so they
 * can be tuned from outside without editing this file.
 */

import { CohortSignals } from "./supply-demand";
import { ProjectMomentum } from "./momentum";

export type Verdict = "buy" | "watch" | "avoid";

export interface Recommendation {
  key: string; // project|bedrooms
  project: string;
  district: string;
  propertyType: string;
  bedrooms: number;
  bedroomLabel: string; // "Studio" | "1 BR" | ...

  opportunityScore: number; // 0-100
  verdict: Verdict;
  tags: RecommendationTag[];
  headline: string;

  /** Each bullet is a plain-English statement anchored in real numbers. */
  reasoning: ReasoningBullet[];

  /** Raw signal snapshot, kept so the UI can render numeric breakdowns. */
  signals: CohortSignals;
  momentum?: ProjectMomentum;
}

export type RecommendationTag =
  | "undervalued"         // >= 15% below area median
  | "high_demand"         // momentum_3mo >= 1.3
  | "tight_supply"        // inventoryMonths <= 3
  | "oversupplied"        // inventoryMonths >= 12
  | "best_unit_type"      // bedroom rate > area all-BR median
  | "distressed_inventory" // listing group has distress
  | "thin_liquidity";     // tx12mo < 8

export interface ReasoningBullet {
  kind: "price" | "demand" | "supply" | "unit_type" | "momentum" | "yield" | "warning";
  text: string;
}

/**
 * Opportunity-score weights. Sum should be 1. Re-tune here without touching
 * the scoring function so changes are diffable and testable.
 */
export const SCORE_WEIGHTS = {
  priceDiscount: 0.30,
  demand: 0.25,
  supplyTightness: 0.20,
  momentum: 0.15,
  unitTypeSpread: 0.10,
} as const;

// --- helpers ---------------------------------------------------------------

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function formatAED(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
  return `AED ${n.toLocaleString()}`;
}

function bedroomLabel(br: number): string {
  if (br === 0) return "Studio";
  if (br >= 6) return "6+ BR";
  return `${br} BR`;
}

// --- sub-scores (0..1) -----------------------------------------------------

/** +15% discount → 1.0, 0% → 0.5, -15% (premium) → 0.0 */
function priceDiscountScore(discountPct: number): number {
  return clamp(0.5 + discountPct / 30, 0, 1);
}

/** momentum 3mo: 1.0 → 0.5, 2.0 → 1.0, 0.5 → 0.25 */
function demandScore(momentum3mo: number, tx90d: number): number {
  const m = clamp(momentum3mo / 2, 0, 1);
  // Thin cohorts get penalized — you need absolute volume, not just a ratio.
  const volume = clamp(tx90d / 20, 0, 1);
  return 0.6 * m + 0.4 * volume;
}

/** inventoryMonths 1.5 → 1.0, 6 → 0.5, 12+ → 0.1 */
function supplyTightnessScore(months: number): number {
  if (months <= 1.5) return 1.0;
  if (months >= 12) return 0.1;
  return clamp(1 - (months - 1.5) / 10.5, 0.1, 1);
}

/** unitTypeSpread 10% premium → 0.8, -5% → 0.4 */
function unitTypeScore(spreadPct: number): number {
  return clamp(0.5 + spreadPct / 25, 0, 1);
}

// --- scoring ---------------------------------------------------------------

export function scoreRecommendation(
  s: CohortSignals,
  m: ProjectMomentum | undefined
): number {
  const priceSub = priceDiscountScore(s.priceDiscountPct);
  const demandSub = demandScore(m?.momentum["3mo"] ?? 1, s.tx90d);
  const supplySub = supplyTightnessScore(s.inventoryMonths);
  const momentumSub = m ? clamp(m.momentum["3mo"] / 2, 0, 1) : 0.5;
  const unitSub = unitTypeScore(s.unitTypeSpreadPct);

  const raw =
    SCORE_WEIGHTS.priceDiscount * priceSub +
    SCORE_WEIGHTS.demand * demandSub +
    SCORE_WEIGHTS.supplyTightness * supplySub +
    SCORE_WEIGHTS.momentum * momentumSub +
    SCORE_WEIGHTS.unitTypeSpread * unitSub;

  return Math.round(raw * 100);
}

// --- tags ------------------------------------------------------------------

function tagsFor(
  s: CohortSignals,
  m: ProjectMomentum | undefined,
  distressCount: number
): RecommendationTag[] {
  const tags: RecommendationTag[] = [];
  if (s.priceDiscountPct >= 15) tags.push("undervalued");
  if ((m?.momentum["3mo"] ?? 1) >= 1.3) tags.push("high_demand");
  if (s.inventoryMonths <= 3) tags.push("tight_supply");
  if (s.inventoryMonths >= 12) tags.push("oversupplied");
  if (s.unitTypeSpreadPct >= 5) tags.push("best_unit_type");
  if (distressCount >= 2) tags.push("distressed_inventory");
  if (s.tx12mo < 8) tags.push("thin_liquidity");
  return tags;
}

// --- narrative -------------------------------------------------------------

function buildReasoning(
  s: CohortSignals,
  m: ProjectMomentum | undefined,
  distressCount: number
): ReasoningBullet[] {
  const bullets: ReasoningBullet[] = [];
  const br = bedroomLabel(s.bedrooms);

  // Price
  if (s.priceDiscountPct >= 5 && s.areaBedroomsMedianPrice > 0) {
    bullets.push({
      kind: "price",
      text:
        `${br} in ${s.project} trades at ${formatAED(s.projectMedianPrice)}, ` +
        `vs ${formatAED(s.areaBedroomsMedianPrice)} area average for ${br} ` +
        `(-${s.priceDiscountPct.toFixed(1)}% discount).`,
    });
  } else if (s.priceDiscountPct <= -10) {
    bullets.push({
      kind: "price",
      text:
        `${br} here is ${Math.abs(s.priceDiscountPct).toFixed(1)}% more expensive ` +
        `than the ${s.district} area average — a scarcity or prestige premium.`,
    });
  } else {
    bullets.push({
      kind: "price",
      text:
        `${br} in ${s.project} sells at ${formatAED(s.projectMedianPrice)}, ` +
        `in line with the ${s.district} area average.`,
    });
  }

  // Demand / momentum
  if (m && m.momentum["3mo"] >= 1.3) {
    bullets.push({
      kind: "demand",
      text:
        `Demand is accelerating: ${m.counts["3mo"]} transactions in the last 90 days ` +
        `(${(m.momentum["3mo"] * 100 - 100).toFixed(0)}% above 12-month baseline).`,
    });
  } else if (m && m.momentum["3mo"] <= 0.6 && m.counts["12mo"] >= 10) {
    bullets.push({
      kind: "demand",
      text:
        `Demand is cooling: only ${m.counts["3mo"]} transactions in the last 90 days ` +
        `vs ${m.counts["12mo"]} over the full year.`,
    });
  } else {
    bullets.push({
      kind: "demand",
      text:
        `Steady demand: ${s.tx90d} transactions in the last 90 days ` +
        `(~${s.txPerMonth90d}/month).`,
    });
  }

  // Supply
  if (s.activeListings > 0) {
    if (s.inventoryMonths <= 3) {
      bullets.push({
        kind: "supply",
        text:
          `Supply is tight: only ${s.activeListings} active listings against ` +
          `${s.tx90d} recent sales — inventory months: ${s.inventoryMonths}.`,
      });
    } else if (s.inventoryMonths >= 12) {
      bullets.push({
        kind: "supply",
        text:
          `Inventory is heavy: ${s.activeListings} active listings vs only ` +
          `${s.tx90d} sales in 90 days — ${s.inventoryMonths} months of supply.`,
      });
    } else {
      bullets.push({
        kind: "supply",
        text:
          `Supply is balanced: ${s.activeListings} active listings, ${s.inventoryMonths} months of inventory.`,
      });
    }
  }

  // Unit-type spread
  if (s.unitTypeSpreadPct >= 5) {
    bullets.push({
      kind: "unit_type",
      text:
        `${br} rate premium: this bedroom type commands ${s.unitTypeSpreadPct.toFixed(1)}% ` +
        `more AED/sqft than the average across all bedroom types in ${s.district}.`,
    });
  } else if (s.unitTypeSpreadPct <= -5) {
    bullets.push({
      kind: "unit_type",
      text:
        `${br} trades at a ${Math.abs(s.unitTypeSpreadPct).toFixed(1)}% AED/sqft discount ` +
        `vs other bedroom types in ${s.district}.`,
    });
  }

  // Distress
  if (distressCount >= 1) {
    bullets.push({
      kind: "supply",
      text:
        `${distressCount} listing${distressCount === 1 ? " is" : "s are"} priced ≥5% below ` +
        `the recent closed-sale rate — genuine below-market inventory on PF/Bayut.`,
    });
  }

  // Warnings
  if (s.tx12mo < 8) {
    bullets.push({
      kind: "warning",
      text:
        `Thin liquidity: only ${s.tx12mo} transactions in the last 12 months — ` +
        `exit may be slow if the market turns.`,
    });
  }

  return bullets;
}

function verdictFrom(score: number, tags: RecommendationTag[]): Verdict {
  if (tags.includes("thin_liquidity") && score < 65) return "avoid";
  if (tags.includes("oversupplied") && !tags.includes("undervalued")) return "watch";
  if (score >= 68) return "buy";
  if (score >= 50) return "watch";
  return "avoid";
}

function headlineFrom(verdict: Verdict, s: CohortSignals): string {
  const br = bedroomLabel(s.bedrooms);
  if (verdict === "buy") {
    return `Buy — ${br} in ${s.project} (${s.district})`;
  }
  if (verdict === "watch") {
    return `Watch — ${br} in ${s.project}`;
  }
  return `Pass — ${br} in ${s.project}`;
}

// --- top-level builder -----------------------------------------------------

export interface BuildRecommendationsOpts {
  /** Minimum opportunity score to surface (default 0 — return everything). */
  minScore?: number;
  /** Maximum cards to return (default 30). */
  limit?: number;
  /** Per-cohort distress count — callers pass the ListingGroup.distressCount map. */
  distressCountByKey?: Map<string, number>;
}

export function buildRecommendations(
  signals: CohortSignals[],
  momentumByKey: Map<string, ProjectMomentum>,
  opts: BuildRecommendationsOpts = {}
): Recommendation[] {
  const { minScore = 0, limit = 30, distressCountByKey = new Map() } = opts;

  const recs: Recommendation[] = signals.map((s) => {
    const m = momentumByKey.get(s.key);
    const distressCount = distressCountByKey.get(s.key) ?? 0;
    const score = scoreRecommendation(s, m);
    const tags = tagsFor(s, m, distressCount);
    const reasoning = buildReasoning(s, m, distressCount);
    const verdict = verdictFrom(score, tags);
    return {
      key: s.key,
      project: s.project,
      district: s.district,
      propertyType: s.propertyType,
      bedrooms: s.bedrooms,
      bedroomLabel: bedroomLabel(s.bedrooms),
      opportunityScore: score,
      verdict,
      tags,
      headline: headlineFrom(verdict, s),
      reasoning,
      signals: s,
      momentum: m,
    };
  });

  return recs
    .filter((r) => r.opportunityScore >= minScore)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, limit);
}

export const TAG_LABELS: Record<RecommendationTag, string> = {
  undervalued: "Undervalued",
  high_demand: "High demand",
  tight_supply: "Tight supply",
  oversupplied: "Oversupplied",
  best_unit_type: "Premium unit type",
  distressed_inventory: "Distress inventory",
  thin_liquidity: "Thin liquidity",
};
