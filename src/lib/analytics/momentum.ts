/**
 * Project momentum analytics.
 *
 * For each (project, bedrooms) cohort we compute transaction counts across
 * 10-day / 3/6/9/12-month windows, then derive a momentum score that asks:
 * "Is this cohort currently trading above or below its 12-month baseline?"
 *
 * Pure data layer. No React. Tested.
 */

import { Transaction } from "@/data/abu-dhabi";

export type MomentumWindow = "10d" | "3mo" | "6mo" | "9mo" | "12mo";

export interface WindowCounts {
  "10d": number;
  "3mo": number;
  "6mo": number;
  "9mo": number;
  "12mo": number;
}

export interface ProjectMomentum {
  project: string;
  district: string;
  propertyType: string;
  bedrooms: number;
  counts: WindowCounts;
  medianPrice: number;      // 12-month median
  medianRate: number;       // 12-month median
  /**
   * Momentum ratio for each window = actual / expected-if-flat.
   * expected = count_12mo * (window_days / 365).
   * Values > 1 = accelerating, < 1 = cooling, 1 = flat.
   */
  momentum: {
    "10d": number;
    "3mo": number;
    "6mo": number;
    "9mo": number;
  };
  /** Recent spike: 30d / prior-90d-baseline, capped at 10 */
  surge30d: number;
  badges: MomentumBadge[];
}

export type MomentumBadge =
  | "most_active"  // top-N by 90d tx count within the requested filter
  | "surging"      // momentum_3mo >= 1.5 AND count_3mo >= 5
  | "accelerating" // momentum_3mo >= 1.25
  | "cooling"      // momentum_3mo <= 0.5 AND count_12mo >= 10
  | "new_demand"   // first-tx-in-last-12mo AND count_3mo >= 3
  | "high_liquidity"; // count_12mo >= 50

const WINDOW_DAYS: Record<MomentumWindow, number> = {
  "10d": 10,
  "3mo": 90,
  "6mo": 180,
  "9mo": 270,
  "12mo": 365,
};

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function median(ns: number[]): number {
  if (!ns.length) return 0;
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

/**
 * Group transactions by (project, bedrooms) and compute window counts +
 * momentum. Filters out rows without a project name or that sold for 0.
 */
export function buildProjectMomentum(
  transactions: Transaction[],
  opts: {
    minCount12mo?: number;  // drop cohorts with < N tx in 12mo (default 3)
    districtFilter?: string;
    propertyTypeFilter?: string;
    bedroomsFilter?: string; // "0" | "1" | ... | "6+" | ""
  } = {}
): ProjectMomentum[] {
  const {
    minCount12mo = 3,
    districtFilter = "",
    propertyTypeFilter = "",
    bedroomsFilter = "",
  } = opts;

  const cutoff12 = daysAgoISO(365);
  const cutoff10d = daysAgoISO(10);
  const cutoff3 = daysAgoISO(90);
  const cutoff6 = daysAgoISO(180);
  const cutoff9 = daysAgoISO(270);
  const cutoffPrior90 = daysAgoISO(120); // last 30d baseline reference (90d ending 30d ago)
  const cutoffLast30 = daysAgoISO(30);

  const cohorts = new Map<string, {
    project: string;
    district: string;
    propertyType: string;
    bedrooms: number;
    prices: number[];
    rates: number[];
    dates: string[];
  }>();

  for (const t of transactions) {
    if (!t.project || t.project === "Unknown" || t.project === "—") continue;
    if (t.price <= 0) continue;
    if (t.date < cutoff12) continue;
    if (districtFilter && t.district !== districtFilter) continue;
    if (propertyTypeFilter && t.propertyType !== propertyTypeFilter) continue;
    if (bedroomsFilter) {
      if (bedroomsFilter === "6+") {
        if (t.bedrooms < 6) continue;
      } else if (t.bedrooms !== Number(bedroomsFilter)) continue;
    }

    const key = `${t.project}|${t.bedrooms}`;
    let c = cohorts.get(key);
    if (!c) {
      c = {
        project: t.project,
        district: t.district,
        propertyType: t.propertyType,
        bedrooms: t.bedrooms,
        prices: [],
        rates: [],
        dates: [],
      };
      cohorts.set(key, c);
    }
    c.prices.push(t.price);
    c.rates.push(t.ratePerSqft);
    c.dates.push(t.date);
  }

  const results: ProjectMomentum[] = [];
  for (const c of cohorts.values()) {
    const count12 = c.dates.length;
    if (count12 < minCount12mo) continue;

    const count10d = c.dates.filter((d) => d >= cutoff10d).length;
    const count3 = c.dates.filter((d) => d >= cutoff3).length;
    const count6 = c.dates.filter((d) => d >= cutoff6).length;
    const count9 = c.dates.filter((d) => d >= cutoff9).length;

    const last30 = c.dates.filter((d) => d >= cutoffLast30).length;
    const prior90 = c.dates.filter((d) => d >= cutoffPrior90 && d < cutoffLast30).length;
    // Surge: how much more activity in last 30d vs the prior 90d avg 30d slice.
    const prior30Avg = prior90 / 3;
    const surge30d = prior30Avg > 0 ? Math.min(10, last30 / prior30Avg) : last30 > 0 ? 10 : 0;

    const expected = (win: number) => (count12 * win) / 365;
    const safeRatio = (actual: number, e: number) =>
      e <= 0 ? (actual > 0 ? 10 : 0) : Math.min(10, actual / e);

    const momentum = {
      "10d": safeRatio(count10d, expected(10)),
      "3mo": safeRatio(count3, expected(90)),
      "6mo": safeRatio(count6, expected(180)),
      "9mo": safeRatio(count9, expected(270)),
    };

    const firstDate = [...c.dates].sort()[0];
    const isNew = firstDate >= daysAgoISO(365);
    const badges: MomentumBadge[] = [];
    if (momentum["3mo"] >= 1.5 && count3 >= 5) badges.push("surging");
    else if (momentum["3mo"] >= 1.25) badges.push("accelerating");
    if (momentum["3mo"] <= 0.5 && count12 >= 10) badges.push("cooling");
    if (isNew && count3 >= 3) badges.push("new_demand");
    if (count12 >= 50) badges.push("high_liquidity");

    results.push({
      project: c.project,
      district: c.district,
      propertyType: c.propertyType,
      bedrooms: c.bedrooms,
      counts: {
        "10d": count10d,
        "3mo": count3,
        "6mo": count6,
        "9mo": count9,
        "12mo": count12,
      },
      medianPrice: Math.round(median(c.prices)),
      medianRate: Math.round(median(c.rates)),
      momentum,
      surge30d: Math.round(surge30d * 10) / 10,
      badges,
    });
  }

  // Mark top-5 by 90d volume with "most_active"
  const top5 = [...results].sort((a, b) => b.counts["3mo"] - a.counts["3mo"]).slice(0, 5);
  for (const r of top5) {
    if (!r.badges.includes("most_active")) r.badges.unshift("most_active");
  }

  return results;
}

export function sortByWindow(
  rows: ProjectMomentum[],
  window: MomentumWindow
): ProjectMomentum[] {
  return [...rows].sort((a, b) => b.counts[window] - a.counts[window]);
}

export const WINDOW_LABELS: Record<MomentumWindow, string> = {
  "10d": "Last 10 days",
  "3mo": "Last 3 months",
  "6mo": "Last 6 months",
  "9mo": "Last 9 months",
  "12mo": "Last 12 months",
};

export { WINDOW_DAYS };
