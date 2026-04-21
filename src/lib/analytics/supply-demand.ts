/**
 * Supply / demand analytics.
 *
 * Combines ADREC transactions (closed sales) with MLS listing groups
 * (live-ish asking inventory) into per-cohort signals an investor actually
 * cares about:
 *
 *   - demand   — recent transaction velocity (90d + 30d z-score)
 *   - supply   — active listings
 *   - tightness — inventory months (listings / monthly tx)
 *   - discount — project median vs area-bedrooms median
 *   - pressure — derived from the above
 *
 * Pure functions, no React. The opportunity score and recommendation text
 * lives in ./recommendations.ts — this file only produces raw signals.
 */

import { Transaction } from "@/data/abu-dhabi";
import { ListingGroup } from "@/lib/mls-data";

export interface CohortSignals {
  key: string; // project|bedrooms
  project: string;
  district: string;
  propertyType: string;
  bedrooms: number;

  // Demand
  tx90d: number;
  tx30d: number;
  tx12mo: number;
  txPerMonth12mo: number;
  txPerMonth90d: number;

  // Supply
  activeListings: number;
  pfListings: number;
  bayutListings: number;

  // Pricing
  projectMedianPrice: number;   // recent (6-12mo) for this cohort
  projectMedianRate: number;
  areaBedroomsMedianPrice: number; // district × bedrooms, all projects
  areaBedroomsMedianRate: number;
  areaAllTypesMedianPrice: number; // district, all bedrooms — for unit-type spread
  priceDiscountPct: number;     // (area - project) / area
  rateDiscountPct: number;

  // Derived
  /** Months of inventory at current sales pace (listings / tx_per_month). */
  inventoryMonths: number;
  /** Ratio of active listings to tx_90d — >1 oversupply, <1 tight */
  supplyDemandRatio: number;
  /** Unit-type spread: how this bedroom's median rate compares to area all-BR median rate */
  unitTypeSpreadPct: number;
}

function median(ns: number[]): number {
  if (!ns.length) return 0;
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Build (district, bedrooms) and (district) medians so each project can be
 * compared to its own area/unit-type peer group.
 */
function buildAreaMedians(transactions: Transaction[]) {
  const cutoff = daysAgoISO(365);
  const districtBr = new Map<string, { prices: number[]; rates: number[] }>();
  const district = new Map<string, { prices: number[]; rates: number[] }>();

  for (const t of transactions) {
    if (!t.project || t.project === "Unknown" || t.project === "—") continue;
    if (t.price <= 0) continue;
    if (t.date < cutoff) continue;

    const dbrKey = `${t.district}|${t.bedrooms}`;
    let g = districtBr.get(dbrKey);
    if (!g) {
      g = { prices: [], rates: [] };
      districtBr.set(dbrKey, g);
    }
    g.prices.push(t.price);
    g.rates.push(t.ratePerSqft);

    let d = district.get(t.district);
    if (!d) {
      d = { prices: [], rates: [] };
      district.set(t.district, d);
    }
    d.prices.push(t.price);
    d.rates.push(t.ratePerSqft);
  }

  return {
    districtBrMedian: (d: string, b: number) => {
      const g = districtBr.get(`${d}|${b}`);
      return g
        ? { price: median(g.prices), rate: median(g.rates) }
        : { price: 0, rate: 0 };
    },
    districtMedian: (d: string) => {
      const g = district.get(d);
      return g
        ? { price: median(g.prices), rate: median(g.rates) }
        : { price: 0, rate: 0 };
    },
  };
}

/**
 * Per-cohort recent tx rollup. `listingGroups` already covers live supply
 * so we don't re-derive it here — callers pass both inputs and this file
 * reconciles them.
 */
export function buildCohortSignals(
  transactions: Transaction[],
  listingGroups: ListingGroup[]
): CohortSignals[] {
  const cutoff12 = daysAgoISO(365);
  const cutoff90 = daysAgoISO(90);
  const cutoff30 = daysAgoISO(30);

  const cohorts = new Map<string, {
    project: string;
    district: string;
    propertyType: string;
    bedrooms: number;
    prices12: number[];
    rates12: number[];
    tx90d: number;
    tx30d: number;
    tx12mo: number;
  }>();

  for (const t of transactions) {
    if (!t.project || t.project === "Unknown" || t.project === "—") continue;
    if (t.price <= 0) continue;
    if (t.date < cutoff12) continue;

    const key = `${t.project}|${t.bedrooms}`;
    let c = cohorts.get(key);
    if (!c) {
      c = {
        project: t.project,
        district: t.district,
        propertyType: t.propertyType,
        bedrooms: t.bedrooms,
        prices12: [],
        rates12: [],
        tx90d: 0,
        tx30d: 0,
        tx12mo: 0,
      };
      cohorts.set(key, c);
    }
    c.prices12.push(t.price);
    c.rates12.push(t.ratePerSqft);
    c.tx12mo++;
    if (t.date >= cutoff90) c.tx90d++;
    if (t.date >= cutoff30) c.tx30d++;
  }

  const area = buildAreaMedians(transactions);
  const listingByKey = new Map(listingGroups.map((g) => [g.key, g]));

  const signals: CohortSignals[] = [];
  for (const c of cohorts.values()) {
    const key = `${c.project}|${c.bedrooms}`;
    const listing = listingByKey.get(key);

    const projectMedianPrice = Math.round(median(c.prices12));
    const projectMedianRate = Math.round(median(c.rates12));
    const areaBr = area.districtBrMedian(c.district, c.bedrooms);
    const areaAll = area.districtMedian(c.district);

    const priceDiscountPct =
      areaBr.price > 0
        ? ((areaBr.price - projectMedianPrice) / areaBr.price) * 100
        : 0;
    const rateDiscountPct =
      areaBr.rate > 0
        ? ((areaBr.rate - projectMedianRate) / areaBr.rate) * 100
        : 0;
    const unitTypeSpreadPct =
      areaAll.rate > 0
        ? ((areaBr.rate - areaAll.rate) / areaAll.rate) * 100
        : 0;

    const txPerMonth12mo = c.tx12mo / 12;
    const txPerMonth90d = c.tx90d / 3;

    const activeListings = listing?.listingCount ?? 0;
    const pfListings = listing?.platforms.propertyfinder ?? 0;
    const bayutListings = listing?.platforms.bayut ?? 0;

    const inventoryMonths =
      txPerMonth90d > 0 ? activeListings / txPerMonth90d : 99;
    const supplyDemandRatio =
      c.tx90d > 0 ? activeListings / c.tx90d : activeListings > 0 ? 99 : 0;

    signals.push({
      key,
      project: c.project,
      district: c.district,
      propertyType: c.propertyType,
      bedrooms: c.bedrooms,

      tx90d: c.tx90d,
      tx30d: c.tx30d,
      tx12mo: c.tx12mo,
      txPerMonth12mo: Math.round(txPerMonth12mo * 10) / 10,
      txPerMonth90d: Math.round(txPerMonth90d * 10) / 10,

      activeListings,
      pfListings,
      bayutListings,

      projectMedianPrice,
      projectMedianRate,
      areaBedroomsMedianPrice: Math.round(areaBr.price),
      areaBedroomsMedianRate: Math.round(areaBr.rate),
      areaAllTypesMedianPrice: Math.round(areaAll.price),
      priceDiscountPct: Math.round(priceDiscountPct * 10) / 10,
      rateDiscountPct: Math.round(rateDiscountPct * 10) / 10,
      inventoryMonths: Math.round(inventoryMonths * 10) / 10,
      supplyDemandRatio: Math.round(supplyDemandRatio * 100) / 100,
      unitTypeSpreadPct: Math.round(unitTypeSpreadPct * 10) / 10,
    });
  }

  return signals;
}
