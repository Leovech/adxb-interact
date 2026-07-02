/**
 * Real-estate assistant query engine.
 *
 * Turns a natural-language query into a structured, data-backed answer by
 * composing the analytics modules that already power the rest of the site:
 *   - smart-search.ts    → categorical filters (district/project/type/bedrooms)
 *   - intent.ts           → what the user wants (find/cheapest/trend/…) +
 *                            numeric constraints (price/yield/size)
 *   - mls-data.ts          → ListingGroup (asking vs closed-sale, per cohort)
 *   - analytics/momentum   → per-cohort transaction velocity
 *   - analytics/supply-demand + recommendations → opportunity scoring
 *   - investor-report.ts   → yield model
 *
 * `buildAssistantContext` computes the heavy, cross-project-comparative
 * analytics ONCE over the full dataset (so area-median comparisons stay
 * correct). `answerQuery` then filters/ranks the precomputed arrays per
 * message — no re-deriving comparative stats on a truncated slice, which
 * would silently zero out every "vs area average" number.
 *
 * Pure functions, no React, no fetch — the chat page owns data loading and
 * calls these directly. Fully unit-testable.
 */

import { Transaction, Hierarchy } from "@/data/abu-dhabi";
import { FilterState, defaultFilters, applyFilters, formatAED } from "@/lib/filters";
import { parseSmartSearch } from "@/lib/smart-search";
import { buildListingGroups, ListingGroup } from "@/lib/mls-data";
import { buildCohortSignals, CohortSignals } from "@/lib/analytics/supply-demand";
import { buildProjectMomentum, ProjectMomentum } from "@/lib/analytics/momentum";
import { buildRecommendations, Recommendation } from "@/lib/analytics/recommendations";
import { estimateYield } from "@/lib/investor-report";
import {
  AssistantIntent,
  AssistantConstraints,
  detectIntent,
  parseConstraints,
} from "./intent";

// --- context (computed once per dataset load) -------------------------------

export interface AssistantContext {
  transactions: Transaction[];
  hierarchy: Hierarchy;
  listingGroups: ListingGroup[];
  cohortSignals: CohortSignals[];
  momentum: ProjectMomentum[];
  recommendations: Recommendation[];
}

export function buildAssistantContext(
  transactions: Transaction[],
  hierarchy: Hierarchy
): AssistantContext {
  const listingGroups = buildListingGroups(transactions);
  const momentum = buildProjectMomentum(transactions);
  const momentumByKey = new Map(momentum.map((m) => [`${m.project}|${m.bedrooms}`, m]));
  const cohortSignals = buildCohortSignals(transactions, listingGroups);
  const distressByKey = new Map(listingGroups.map((g) => [g.key, g.distressCount]));
  const recommendations = buildRecommendations(cohortSignals, momentumByKey, {
    distressCountByKey: distressByKey,
    limit: 300,
  });

  return { transactions, hierarchy, listingGroups, cohortSignals, momentum, recommendations };
}

// --- answer shape ------------------------------------------------------------

export interface AssistantRow {
  key: string;
  project: string;
  district: string;
  propertyType: string;
  bedroomLabel: string;
  medianPrice: number;
  medianRate: number;
  count: number;
  yieldPct?: number;
  badge?: string;
}

export interface AssistantChartPoint {
  label: string;
  value: number;
}

export interface AssistantAnswer {
  intent: AssistantIntent;
  query: string;
  narrative: string;
  filterChips: string[];
  stats: { label: string; value: string }[];
  rows: AssistantRow[];
  chart?: AssistantChartPoint[];
  reportLink?: { project: string; bedrooms: number } | null;
  suggestions: string[];
  matchCount: number;
}

// --- generic helpers ---------------------------------------------------------

function median(ns: number[]): number {
  if (!ns.length) return 0;
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function bedroomLabel(br: number): string {
  if (br === 0) return "Studio";
  if (br >= 6) return "6+ BR";
  return `${br} BR`;
}

interface CategoryRow {
  district: string;
  project: string;
  propertyType: string;
  bedrooms: number;
}

interface CategoryFilters {
  district?: string;
  project?: string;
  propertyType?: string;
  bedrooms?: string; // "0".."5" | "6+"
}

function matchesCategory(row: CategoryRow, f: CategoryFilters): boolean {
  if (f.district && row.district !== f.district) return false;
  if (f.project && row.project !== f.project) return false;
  if (f.propertyType && row.propertyType !== f.propertyType) return false;
  if (f.bedrooms) {
    if (f.bedrooms === "6+") {
      if (row.bedrooms < 6) return false;
    } else if (row.bedrooms !== Number(f.bedrooms)) return false;
  }
  return true;
}

function buildFilterChips(filters: CategoryFilters, constraints: AssistantConstraints): string[] {
  const chips: string[] = [];
  if (filters.district) chips.push(filters.district);
  if (filters.project) chips.push(filters.project);
  if (filters.propertyType) chips.push(filters.propertyType);
  if (filters.bedrooms) chips.push(filters.bedrooms === "0" ? "Studio" : `${filters.bedrooms} BR`);
  if (constraints.priceMin != null || constraints.priceMax != null) {
    if (constraints.priceMin != null && constraints.priceMax != null) {
      chips.push(`${formatAED(constraints.priceMin)}–${formatAED(constraints.priceMax)}`);
    } else if (constraints.priceMax != null) {
      chips.push(`Under ${formatAED(constraints.priceMax)}`);
    } else if (constraints.priceMin != null) {
      chips.push(`Over ${formatAED(constraints.priceMin)}`);
    }
  }
  if (constraints.yieldMin != null) chips.push(`Yield ≥ ${constraints.yieldMin}%`);
  if (constraints.yieldMax != null) chips.push(`Yield ≤ ${constraints.yieldMax}%`);
  if (constraints.sizeMin != null) chips.push(`> ${constraints.sizeMin.toLocaleString()} sqft`);
  if (constraints.sizeMax != null) chips.push(`< ${constraints.sizeMax.toLocaleString()} sqft`);
  return chips;
}

function scopeDescription(filters: CategoryFilters): string {
  const parts: string[] = [];
  if (filters.bedrooms) parts.push(filters.bedrooms === "0" ? "studios" : `${filters.bedrooms}BR units`);
  else parts.push("units");
  if (filters.propertyType) parts.push(`(${filters.propertyType})`);
  if (filters.project) parts.push(`in ${filters.project}`);
  else if (filters.district) parts.push(`in ${filters.district}`);
  else parts.push("across Abu Dhabi");
  return parts.join(" ");
}

function monthlyRateTrend(transactions: Transaction[]): AssistantChartPoint[] {
  const byMonth = new Map<string, number[]>();
  for (const t of transactions) {
    if (t.ratePerSqft <= 0) continue;
    const key = t.date.slice(0, 7);
    const arr = byMonth.get(key) || [];
    arr.push(t.ratePerSqft);
    byMonth.set(key, arr);
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, rates]) => ({ label, value: Math.round(median(rates)) }));
}

function reportLinkFromRow(row: AssistantRow | undefined): { project: string; bedrooms: number } | null {
  if (!row) return null;
  const brMatch = row.bedroomLabel === "Studio" ? 0 : parseInt(row.bedroomLabel, 10);
  if (Number.isNaN(brMatch)) return null;
  return { project: row.project, bedrooms: brMatch };
}

// --- cohort aggregation from raw transactions (for find/cheapest/etc) ------

function aggregateCohorts(transactions: Transaction[]): AssistantRow[] {
  const map = new Map<
    string,
    { project: string; district: string; propertyType: string; bedrooms: number; prices: number[]; rates: number[] }
  >();
  for (const t of transactions) {
    if (!t.project || t.project === "Unknown" || t.project === "—" || t.price <= 0) continue;
    const key = `${t.project}|${t.bedrooms}`;
    let g = map.get(key);
    if (!g) {
      g = { project: t.project, district: t.district, propertyType: t.propertyType, bedrooms: t.bedrooms, prices: [], rates: [] };
      map.set(key, g);
    }
    g.prices.push(t.price);
    if (t.ratePerSqft > 0) g.rates.push(t.ratePerSqft);
  }
  const rows: AssistantRow[] = [];
  for (const [key, g] of map) {
    rows.push({
      key,
      project: g.project,
      district: g.district,
      propertyType: g.propertyType,
      bedroomLabel: bedroomLabel(g.bedrooms),
      medianPrice: Math.round(median(g.prices)),
      medianRate: Math.round(median(g.rates)),
      count: g.prices.length,
    });
  }
  return rows;
}

// --- intent handlers ----------------------------------------------------------

function emptyAnswer(query: string): AssistantAnswer {
  return {
    intent: "find",
    query,
    narrative:
      "Ask me something like \"cheapest studio in Yas Island\", \"2BR with yield above 7% in Al Reem Island\", or \"what's trending right now\".",
    filterChips: [],
    stats: [],
    rows: [],
    suggestions: [
      "Cheapest studio in Yas Island",
      "2BR with yield above 7% in Al Reem Island",
      "What's trending right now?",
      "Best investment in Al Reem Island",
    ],
    matchCount: 0,
  };
}

function noMatchAnswer(query: string, intent: AssistantIntent, filterChips: string[]): AssistantAnswer {
  return {
    intent,
    query,
    narrative: "No matching transactions or listings found for that. Try a broader district or drop a filter.",
    filterChips,
    stats: [],
    rows: [],
    suggestions: ["Show all districts", "What's trending right now?", "Best investment right now"],
    matchCount: 0,
  };
}

function answerCount(query: string, filtered: Transaction[], filterChips: string[], scope: string): AssistantAnswer {
  if (filtered.length === 0) return noMatchAnswer(query, "count", filterChips);
  const prices = filtered.map((t) => t.price).filter((p) => p > 0);
  return {
    intent: "count",
    query,
    narrative: `Found ${filtered.length.toLocaleString()} closed transactions for ${scope}.`,
    filterChips,
    stats: [
      { label: "Transactions", value: filtered.length.toLocaleString() },
      { label: "Median price", value: formatAED(median(prices)) },
      { label: "Total volume", value: formatAED(prices.reduce((s, p) => s + p, 0)) },
    ],
    rows: aggregateCohorts(filtered).sort((a, b) => b.count - a.count).slice(0, 8),
    suggestions: ["Average price for this", "Cheapest option here", "What's trending here?"],
    matchCount: filtered.length,
  };
}

function answerAverage(query: string, filtered: Transaction[], filterChips: string[], scope: string): AssistantAnswer {
  if (filtered.length === 0) return noMatchAnswer(query, "average", filterChips);
  const prices = filtered.map((t) => t.price).filter((p) => p > 0);
  const rates = filtered.map((t) => t.ratePerSqft).filter((r) => r > 0);
  const sizes = filtered.map((t) => t.sizeSqft).filter((s) => s > 0);
  const medPrice = median(prices);
  const medRate = median(rates);
  return {
    intent: "average",
    query,
    narrative:
      `The median price for ${scope} is ${formatAED(medPrice)} ` +
      `(${Math.round(medRate).toLocaleString()} AED/sqft) across ${filtered.length.toLocaleString()} transactions.`,
    filterChips,
    stats: [
      { label: "Median price", value: formatAED(medPrice) },
      { label: "Median rate", value: `${Math.round(medRate).toLocaleString()} AED/sqft` },
      { label: "Typical size", value: `${Math.round(median(sizes)).toLocaleString()} sqft` },
      { label: "Sample size", value: filtered.length.toLocaleString() },
    ],
    rows: aggregateCohorts(filtered).sort((a, b) => b.count - a.count).slice(0, 6),
    chart: monthlyRateTrend(filtered),
    suggestions: ["Cheapest option here", "What's trending here?", "Best investment here"],
    matchCount: filtered.length,
  };
}

function answerExtreme(
  query: string,
  intent: "cheapest" | "expensive",
  filtered: Transaction[],
  filterChips: string[],
  scope: string
): AssistantAnswer {
  if (filtered.length === 0) return noMatchAnswer(query, intent, filterChips);

  let cohorts = aggregateCohorts(filtered).filter((r) => r.count >= 2);
  if (cohorts.length === 0) cohorts = aggregateCohorts(filtered); // degrade gracefully for thin data

  cohorts.sort((a, b) => (intent === "cheapest" ? a.medianRate - b.medianRate : b.medianRate - a.medianRate));
  const top = cohorts.slice(0, 6);
  const winner = top[0];

  const narrative = winner
    ? `${intent === "cheapest" ? "Cheapest" : "Most expensive"} match for ${scope}: ` +
      `${winner.bedroomLabel} in ${winner.project} (${winner.district}) — ` +
      `${formatAED(winner.medianPrice)} median, ${winner.medianRate.toLocaleString()} AED/sqft, ` +
      `from ${winner.count} recent sale${winner.count === 1 ? "" : "s"}.`
    : "No matches found.";

  return {
    intent,
    query,
    narrative,
    filterChips,
    stats: winner
      ? [
          { label: "Median price", value: formatAED(winner.medianPrice) },
          { label: "Median rate", value: `${winner.medianRate.toLocaleString()} AED/sqft` },
          { label: "Sales", value: winner.count.toString() },
        ]
      : [],
    rows: top,
    reportLink: reportLinkFromRow(winner),
    suggestions: ["Show me the investor report", "What's the average here?", "Is this trending?"],
    matchCount: cohorts.length,
  };
}

function answerFind(query: string, filtered: Transaction[], filterChips: string[], scope: string): AssistantAnswer {
  if (filtered.length === 0) return noMatchAnswer(query, "find", filterChips);

  const cohorts = aggregateCohorts(filtered).sort((a, b) => b.count - a.count);
  const prices = filtered.map((t) => t.price).filter((p) => p > 0);

  return {
    intent: "find",
    query,
    narrative:
      `Found ${filtered.length.toLocaleString()} transactions across ${cohorts.length} project${cohorts.length === 1 ? "" : "s"} ` +
      `for ${scope}. Median price: ${formatAED(median(prices))}.`,
    filterChips,
    stats: [
      { label: "Transactions", value: filtered.length.toLocaleString() },
      { label: "Projects", value: cohorts.length.toString() },
      { label: "Median price", value: formatAED(median(prices)) },
    ],
    rows: cohorts.slice(0, 8),
    chart: monthlyRateTrend(filtered),
    suggestions: ["Cheapest option here", "Best investment here", "What's trending here?"],
    matchCount: filtered.length,
  };
}

function answerYield(
  query: string,
  ctx: AssistantContext,
  filters: CategoryFilters,
  constraints: AssistantConstraints,
  filterChips: string[],
  scope: string
): AssistantAnswer {
  const rows: AssistantRow[] = [];
  for (const g of ctx.listingGroups) {
    if (!matchesCategory(g, filters)) continue;
    if (constraints.priceMin != null && g.recentMedianPrice < constraints.priceMin) continue;
    if (constraints.priceMax != null && g.recentMedianPrice > constraints.priceMax) continue;
    const y = estimateYield(g);
    if (constraints.yieldMin != null && y.grossPct < constraints.yieldMin) continue;
    if (constraints.yieldMax != null && y.grossPct > constraints.yieldMax) continue;
    rows.push({
      key: g.key,
      project: g.project,
      district: g.district,
      propertyType: g.propertyType,
      bedroomLabel: bedroomLabel(g.bedrooms),
      medianPrice: g.recentMedianPrice,
      medianRate: g.recentMedianRate,
      count: g.adrecTxCount,
      yieldPct: y.grossPct,
    });
  }

  if (rows.length === 0) return noMatchAnswer(query, "find", filterChips);

  rows.sort((a, b) => (b.yieldPct ?? 0) - (a.yieldPct ?? 0));
  const top = rows.slice(0, 8);
  const best = top[0];
  const avgYield = median(rows.map((r) => r.yieldPct ?? 0));

  return {
    intent: "find",
    query,
    narrative:
      `${rows.length} project${rows.length === 1 ? "" : "s"} match your yield target for ${scope}. ` +
      `Best: ${best.bedroomLabel} in ${best.project} (${best.district}) at a modelled ` +
      `${(best.yieldPct ?? 0).toFixed(1)}% gross yield, ${formatAED(best.medianPrice)}.`,
    filterChips,
    stats: [
      { label: "Best yield", value: `${(best.yieldPct ?? 0).toFixed(1)}%` },
      { label: "Median yield (matches)", value: `${avgYield.toFixed(1)}%` },
      { label: "Matching projects", value: rows.length.toString() },
    ],
    rows: top,
    reportLink: reportLinkFromRow(best),
    suggestions: ["Show me the investor report", "Is this project trending?", "Best investment overall"],
    matchCount: rows.length,
  };
}

function answerTrend(
  query: string,
  ctx: AssistantContext,
  filters: CategoryFilters,
  filterChips: string[],
  scope: string
): AssistantAnswer {
  const matched = ctx.momentum.filter((m) => matchesCategory(m, filters));
  if (matched.length === 0) return noMatchAnswer(query, "trend", filterChips);

  const surging = matched.filter((m) => m.badges.includes("surging"));
  const ranked = [...matched].sort((a, b) => b.momentum["3mo"] - a.momentum["3mo"]).slice(0, 8);
  const top = ranked[0];

  const rows: AssistantRow[] = ranked.map((m) => ({
    key: `${m.project}|${m.bedrooms}`,
    project: m.project,
    district: m.district,
    propertyType: m.propertyType,
    bedroomLabel: bedroomLabel(m.bedrooms),
    medianPrice: m.medianPrice,
    medianRate: m.medianRate,
    count: m.counts["3mo"],
    badge: m.badges[0],
  }));

  return {
    intent: "trend",
    query,
    narrative:
      `${surging.length} project${surging.length === 1 ? " is" : "s are"} surging for ${scope}. ` +
      `Top mover: ${bedroomLabel(top.bedrooms)} in ${top.project} — ` +
      `${top.counts["3mo"]} sales in the last 90 days ` +
      `(${(top.momentum["3mo"] * 100 - 100).toFixed(0)}% above its 12-month baseline).`,
    filterChips,
    stats: [
      { label: "Surging projects", value: surging.length.toString() },
      { label: "Cohorts tracked", value: matched.length.toString() },
      { label: "Top momentum", value: `${top.momentum["3mo"].toFixed(2)}×` },
    ],
    rows,
    reportLink: { project: top.project, bedrooms: top.bedrooms },
    suggestions: ["Best investment among these", "Show me the investor report", "Cheapest option here"],
    matchCount: matched.length,
  };
}

function answerRecommend(
  query: string,
  ctx: AssistantContext,
  filters: CategoryFilters,
  filterChips: string[],
  scope: string
): AssistantAnswer {
  const matched = ctx.recommendations.filter((r) => matchesCategory(r, filters) && r.verdict === "buy");
  const pool = matched.length > 0 ? matched : ctx.recommendations.filter((r) => matchesCategory(r, filters));

  if (pool.length === 0) return noMatchAnswer(query, "recommend", filterChips);

  const top = pool.slice(0, 6);
  const winner = top[0];

  const rows: AssistantRow[] = top.map((r) => ({
    key: r.key,
    project: r.project,
    district: r.district,
    propertyType: r.propertyType,
    bedroomLabel: r.bedroomLabel,
    medianPrice: r.signals.projectMedianPrice,
    medianRate: r.signals.projectMedianRate,
    count: r.signals.tx12mo,
    badge: `${r.opportunityScore}/100 · ${r.verdict}`,
  }));

  return {
    intent: "recommend",
    query,
    narrative:
      `Top pick for ${scope}: ${winner.headline}. Opportunity score ${winner.opportunityScore}/100. ` +
      (winner.reasoning[0]?.text ?? ""),
    filterChips,
    stats: [
      { label: "Opportunity score", value: `${winner.opportunityScore}/100` },
      { label: "Verdict", value: winner.verdict },
      { label: "Candidates reviewed", value: pool.length.toString() },
    ],
    rows,
    reportLink: { project: winner.project, bedrooms: winner.bedrooms },
    suggestions: ["Show me the investor report", "Is this trending?", "What's the yield on this?"],
    matchCount: pool.length,
  };
}

// --- top-level entry point ----------------------------------------------------

export function answerQuery(query: string, ctx: AssistantContext): AssistantAnswer {
  const trimmed = query.trim();
  if (!trimmed) return emptyAnswer(query);

  const intent = detectIntent(trimmed);
  const constraints = parseConstraints(trimmed);
  const parsed = parseSmartSearch(trimmed, ctx.hierarchy).filters;
  const filters: CategoryFilters = {
    district: parsed.district,
    project: parsed.project,
    propertyType: parsed.propertyType,
    bedrooms: parsed.bedrooms,
  };

  const hasAnyFilter =
    !!filters.district || !!filters.project || !!filters.propertyType || !!filters.bedrooms;
  const hasAnyConstraint =
    constraints.priceMin != null || constraints.priceMax != null ||
    constraints.yieldMin != null || constraints.yieldMax != null ||
    constraints.sizeMin != null || constraints.sizeMax != null;
  const hasIntentKeyword = intent !== "find";

  // A bare, unfilterable query ("hello", "help") — guide the user instead
  // of dumping the entire 116k-row market.
  if (!hasAnyFilter && !hasAnyConstraint && !hasIntentKeyword) {
    return emptyAnswer(query);
  }

  const filterChips = buildFilterChips(filters, constraints);
  const scope = scopeDescription(filters);

  if (intent === "recommend") return answerRecommend(trimmed, ctx, filters, filterChips, scope);
  if (intent === "trend") return answerTrend(trimmed, ctx, filters, filterChips, scope);
  if (constraints.yieldMin != null || constraints.yieldMax != null) {
    return answerYield(trimmed, ctx, filters, constraints, filterChips, scope);
  }

  const filterState: FilterState = {
    ...defaultFilters,
    district: filters.district || "",
    project: filters.project || "",
    propertyType: filters.propertyType || "",
    bedrooms: filters.bedrooms || "",
    status: parsed.status || "",
    sequence: parsed.sequence || "",
    assetClass: parsed.assetClass || "",
    priceMin: constraints.priceMin != null ? String(constraints.priceMin) : "",
    priceMax: constraints.priceMax != null ? String(constraints.priceMax) : "",
    sizeMin: constraints.sizeMin != null ? String(constraints.sizeMin) : "",
    sizeMax: constraints.sizeMax != null ? String(constraints.sizeMax) : "",
  };
  const filtered = applyFilters(ctx.transactions, filterState);

  switch (intent) {
    case "count":
      return answerCount(trimmed, filtered, filterChips, scope);
    case "average":
      return answerAverage(trimmed, filtered, filterChips, scope);
    case "cheapest":
      return answerExtreme(trimmed, "cheapest", filtered, filterChips, scope);
    case "expensive":
      return answerExtreme(trimmed, "expensive", filtered, filterChips, scope);
    default:
      return answerFind(trimmed, filtered, filterChips, scope);
  }
}
