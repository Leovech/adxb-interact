/**
 * Investor report data layer.
 *
 * Given an MLS ListingGroup (one project + bedroom config) plus the underlying
 * ADREC transactions, derive the metrics an investor or buyer's-side broker
 * would expect on a one-page report:
 *
 *   - Market position (asking vs market, premium / discount)
 *   - Liquidity (transactions per month, days-on-market proxy)
 *   - Inventory split (PF vs Bayut, distress count)
 *   - Price trend (12-month rolling median rate)
 *   - Estimated rental yield (district-rate × occupancy assumption)
 *   - Best deals (top distress listings by discount)
 *   - Auto-generated investment thesis
 *
 * All math is pure and deterministic so the tests can pin behaviour.
 */

import { Transaction } from "@/data/abu-dhabi";
import { ListingGroup, MLSListing, DISTRESS_THRESHOLD } from "./mls-data";

// --- Generic helpers ---------------------------------------------------------

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

// --- Public types ------------------------------------------------------------

export interface MonthlyPoint {
  month: string;       // YYYY-MM
  txCount: number;
  medianPrice: number;
  medianRate: number;
}

export interface YieldEstimate {
  /** Annual gross yield as a percentage (e.g. 6.4). */
  grossPct: number;
  /** Estimated monthly rent in AED, rounded to nearest 1000. */
  monthlyRentAED: number;
  /** Confidence in the estimate. */
  confidence: "low" | "medium" | "high";
  /** Free-text describing how we got there. */
  basis: string;
}

export interface BestDealRow {
  listing: MLSListing;
  discountPct: number;       // negative number, e.g. -7.4
  estimatedSavingAED: number;
}

export interface InvestmentThesis {
  /** "buy" | "watch" | "avoid" */
  verdict: "buy" | "watch" | "avoid";
  headline: string;
  bullets: string[];
}

export interface InvestorReport {
  // Project header
  project: string;
  district: string;
  propertyType: string;
  bedrooms: number;

  // Market position — "market" = RECENT window (6-12mo), the honest anchor
  // for live PF/Bayut asking prices. Long-run 24mo median is exposed as
  // `historicalRateMedian` so readers can see how fast the market has moved.
  askPriceMedianAED: number;
  marketPriceMedianAED: number;
  askRateMedian: number;
  marketRateMedian: number;
  historicalPriceMedianAED: number; // 24mo median
  historicalRateMedian: number;     // 24mo median
  recentWindowMonths: number;       // 6, 12, or 24
  recentTxCount: number;
  premiumPct: number;
  typicalSizeSqft: number;

  // Liquidity
  txLast24mo: number;
  txPerMonth: number;
  monthsCovered: number;

  // Inventory
  totalListings: number;
  pfCount: number;
  bayutCount: number;
  distressCount: number;
  distressThresholdPct: number;

  // Trend (oldest → newest), bucketed by month
  trend: MonthlyPoint[];

  // Yield + best deals
  yieldEstimate: YieldEstimate;
  bestDeals: BestDealRow[];

  // Auto-generated thesis
  thesis: InvestmentThesis;

  // Provenance
  generatedAt: string; // ISO
  adrecLastDate: string;
}

// --- Yield model -------------------------------------------------------------

// Conservative yield bands by district tier (Abu Dhabi 2024-2026 market).
// "Tier 1" = Saadiyat / Yas / Reem core, "Tier 2" = Khalifa City, Al Raha,
// "Tier 3" = MBZ City, Mussafah, Bani Yas, etc.
const TIER_1 = new Set([
  "Saadiyat Island", "Yas Island", "Al Reem Island", "Al Maryah Island",
]);
const TIER_2 = new Set([
  "Al Raha Beach", "Khalifa City", "Al Reef", "Hudayriyat Island",
]);

function districtYieldFloor(district: string): number {
  if (TIER_1.has(district)) return 0.055; // 5.5%
  if (TIER_2.has(district)) return 0.065; // 6.5%
  return 0.075; // 7.5% (suburbs / older stock typically yield higher)
}

export function estimateYield(group: ListingGroup): YieldEstimate {
  const floor = districtYieldFloor(group.district);
  const ceiling = floor + 0.015; // ±150bps band

  // Anchor to the RECENT median price (6-12mo) so yield reflects today's
  // market, not a stale 24mo average that drags rising-market yields down.
  const grossPct = ((floor + ceiling) / 2) * 100;
  const annualRent = group.recentMedianPrice * ((floor + ceiling) / 2);
  const monthlyRentAED = Math.round(annualRent / 12 / 1000) * 1000;

  let confidence: YieldEstimate["confidence"] = "low";
  if (group.recentTxCount >= 20) confidence = "high";
  else if (group.recentTxCount >= 8) confidence = "medium";

  return {
    grossPct: Math.round(grossPct * 10) / 10,
    monthlyRentAED,
    confidence,
    basis:
      `Modelled from district yield band (${(floor * 100).toFixed(1)}–${(ceiling * 100).toFixed(1)}%) ` +
      `applied to recent ${group.recentWindowMonths}mo median price ` +
      `(${group.recentMedianPrice.toLocaleString()} AED, n=${group.recentTxCount}). ` +
      `Replace with live rental comparables when available.`,
  };
}

// --- Trend ------------------------------------------------------------------

export function buildPriceTrend(
  transactions: Transaction[],
  group: ListingGroup,
  months = 12
): MonthlyPoint[] {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const buckets = new Map<string, { prices: number[]; rates: number[] }>();
  for (const t of transactions) {
    if (t.project !== group.project) continue;
    if (t.bedrooms !== group.bedrooms) continue;
    if (t.date < cutoffIso) continue;
    if (t.price <= 0 || t.sizeSqft <= 0) continue;
    const key = monthKey(t.date);
    let b = buckets.get(key);
    if (!b) {
      b = { prices: [], rates: [] };
      buckets.set(key, b);
    }
    b.prices.push(t.price);
    b.rates.push(t.ratePerSqft);
  }

  const points: MonthlyPoint[] = [];
  for (const [month, b] of buckets) {
    points.push({
      month,
      txCount: b.prices.length,
      medianPrice: Math.round(median(b.prices)),
      medianRate: Math.round(median(b.rates)),
    });
  }
  points.sort((a, b) => a.month.localeCompare(b.month));
  return points;
}

// --- Best deals --------------------------------------------------------------

export function topDistressDeals(
  group: ListingGroup,
  limit = 5
): BestDealRow[] {
  // Discount measured vs RECENT median (what the unit is competing
  // against on PF/Bayut right now), not the 24-month median.
  const cutoff = group.recentMedianRate * (1 - DISTRESS_THRESHOLD);
  const rows: BestDealRow[] = [];
  for (const l of group.listings) {
    if (l.askingRate >= cutoff) continue;
    const discountPct =
      ((l.askingRate - group.recentMedianRate) / group.recentMedianRate) * 100;
    const fairPrice = Math.round(l.sizeSqft * group.recentMedianRate);
    rows.push({
      listing: l,
      discountPct,
      estimatedSavingAED: Math.max(0, fairPrice - l.askingPrice),
    });
  }
  rows.sort((a, b) => a.discountPct - b.discountPct);
  return rows.slice(0, limit);
}

// --- Liquidity --------------------------------------------------------------

export function computeLiquidity(
  transactions: Transaction[],
  group: ListingGroup,
  months = 24
) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  let count = 0;
  for (const t of transactions) {
    if (t.project !== group.project) continue;
    if (t.bedrooms !== group.bedrooms) continue;
    if (t.date < cutoffIso) continue;
    count++;
  }
  return {
    txLast24mo: count,
    txPerMonth: Math.round((count / months) * 10) / 10,
    monthsCovered: months,
  };
}

// --- Thesis -----------------------------------------------------------------

export function buildThesis(
  group: ListingGroup,
  liquidity: { txPerMonth: number },
  yieldEst: YieldEstimate
): InvestmentThesis {
  const bullets: string[] = [];
  let buySignals = 0;
  let avoidSignals = 0;

  // Premium/discount
  if (group.premiumPct < -2) {
    bullets.push(
      `Asking median is ${Math.abs(group.premiumPct).toFixed(1)}% below recent ADREC sales — sellers are pricing under market.`
    );
    buySignals += 2;
  } else if (group.premiumPct > 8) {
    bullets.push(
      `Asking median is ${group.premiumPct.toFixed(1)}% above recent ADREC sales — sellers are aspirational, expect to negotiate.`
    );
    avoidSignals += 1;
  } else {
    bullets.push(
      `Asking median is within ${Math.abs(group.premiumPct).toFixed(1)}% of recent sales — fair priced.`
    );
  }

  // Distress availability
  if (group.distressCount >= 3) {
    bullets.push(
      `${group.distressCount} listings sitting ≥${(DISTRESS_THRESHOLD * 100).toFixed(0)}% below market — genuine distress inventory available.`
    );
    buySignals += 1;
  } else if (group.distressCount === 0) {
    bullets.push(
      `No distress inventory — entry will be at or above ADREC median.`
    );
  }

  // Liquidity
  if (liquidity.txPerMonth >= 4) {
    bullets.push(
      `Active resale market: ~${liquidity.txPerMonth} ADREC transactions per month for this BR config.`
    );
    buySignals += 1;
  } else if (liquidity.txPerMonth < 1) {
    bullets.push(
      `Thin resale market: <1 transaction/month — exit liquidity is a risk.`
    );
    avoidSignals += 2;
  }

  // Yield
  if (yieldEst.grossPct >= 7) {
    bullets.push(
      `Modelled gross yield ${yieldEst.grossPct.toFixed(1)}% — attractive for cash buyers.`
    );
    buySignals += 1;
  } else if (yieldEst.grossPct < 5) {
    bullets.push(
      `Modelled gross yield ${yieldEst.grossPct.toFixed(1)}% — capital appreciation play, not income.`
    );
  }

  let verdict: InvestmentThesis["verdict"];
  let headline: string;
  if (avoidSignals >= buySignals && avoidSignals >= 2) {
    verdict = "avoid";
    headline = "Pass — risk-reward looks unfavourable today.";
  } else if (buySignals >= 3) {
    verdict = "buy";
    headline = "Buy — pricing, liquidity and yield align.";
  } else {
    verdict = "watch";
    headline = "Watch — wait for a clearer signal.";
  }

  return { verdict, headline, bullets };
}

// --- Top-level builder -------------------------------------------------------

export function buildInvestorReport(
  group: ListingGroup,
  transactions: Transaction[]
): InvestorReport {
  const liquidity = computeLiquidity(transactions, group);
  const yieldEst = estimateYield(group);
  const trend = buildPriceTrend(transactions, group);
  const bestDeals = topDistressDeals(group);
  const thesis = buildThesis(group, liquidity, yieldEst);

  return {
    project: group.project,
    district: group.district,
    propertyType: group.propertyType,
    bedrooms: group.bedrooms,

    askPriceMedianAED: group.askPriceMedian,
    marketPriceMedianAED: group.recentMedianPrice,
    askRateMedian: group.askRateMedian,
    marketRateMedian: group.recentMedianRate,
    historicalPriceMedianAED: group.adrecMedianPrice,
    historicalRateMedian: group.adrecMedianRate,
    recentWindowMonths: group.recentWindowMonths,
    recentTxCount: group.recentTxCount,
    premiumPct: group.premiumPct,
    typicalSizeSqft: group.typicalSize,

    ...liquidity,

    totalListings: group.listingCount,
    pfCount: group.platforms.propertyfinder,
    bayutCount: group.platforms.bayut,
    distressCount: group.distressCount,
    distressThresholdPct: DISTRESS_THRESHOLD * 100,

    trend,
    yieldEstimate: yieldEst,
    bestDeals,
    thesis,

    generatedAt: new Date().toISOString(),
    adrecLastDate: group.adrecLastDate,
  };
}
