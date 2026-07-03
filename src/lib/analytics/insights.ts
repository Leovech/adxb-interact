/**
 * Market pulse insight chips.
 *
 * Scans the transaction dataset (+ the derived MLS listing groups) for a
 * handful of notable, deep-linkable signals: the biggest QoQ movers, a
 * volume spike, and the largest gap between what's listed and what's
 * actually closing. Pure data layer — no React — so the same signals can
 * be surfaced on the Dashboard, the landing page, and fed to the AI
 * assistant's context.
 */

import { Transaction, Hierarchy } from "@/data/abu-dhabi";
import { buildListingGroups } from "@/lib/mls-data";

export type InsightKind =
  | "qoq_mover_up"
  | "qoq_mover_down"
  | "volume_spike"
  | "supply_outpacing"
  | "ask_gap";

export interface MarketInsight {
  kind: InsightKind;
  title: string;
  detail: string;
  href: string;
  entityType: "district" | "project";
  entityName: string;
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function districtHref(name: string): string {
  return `/dashboard?district=${encodeURIComponent(name)}`;
}

function projectHref(name: string): string {
  return `/dashboard?project=${encodeURIComponent(name)}`;
}

export function buildMarketInsights(
  transactions: Transaction[],
  hierarchy: Hierarchy,
  opts: { limit?: number } = {}
): MarketInsight[] {
  const limit = opts.limit ?? 6;
  const insights: MarketInsight[] = [];

  const cutoff90 = daysAgoISO(90);
  const cutoff180 = daysAgoISO(180);
  const cutoff30 = daysAgoISO(30);
  const cutoff120 = daysAgoISO(120);

  // --- 1. Biggest QoQ movers, by district --------------------------------
  type Mover = { district: string; changePct: number; medianRate: number };
  const movers: Mover[] = [];
  for (const d of hierarchy.districts) {
    const rows = transactions.filter((t) => t.district === d.name && t.ratePerSqft > 0);
    const recent = rows.filter((t) => t.date >= cutoff90);
    const prior = rows.filter((t) => t.date >= cutoff180 && t.date < cutoff90);
    if (recent.length < 5 || prior.length < 5) continue;
    const recentMedian = median(recent.map((t) => t.ratePerSqft));
    const priorMedian = median(prior.map((t) => t.ratePerSqft));
    if (priorMedian <= 0) continue;
    const changePct = ((recentMedian - priorMedian) / priorMedian) * 100;
    movers.push({ district: d.name, changePct, medianRate: recentMedian });
  }
  movers.sort((a, b) => b.changePct - a.changePct);
  const topUp = movers[0];
  const topDown = movers[movers.length - 1];
  if (topUp && topUp.changePct > 0) {
    insights.push({
      kind: "qoq_mover_up",
      title: `${topUp.district} up ${topUp.changePct.toFixed(1)}%`,
      detail: `Median rate rose ${topUp.changePct.toFixed(1)}% quarter-on-quarter to ${Math.round(topUp.medianRate).toLocaleString()} AED/sqft.`,
      href: districtHref(topUp.district),
      entityType: "district",
      entityName: topUp.district,
    });
  }
  if (topDown && topDown.changePct < 0 && topDown.district !== topUp?.district) {
    insights.push({
      kind: "qoq_mover_down",
      title: `${topDown.district} down ${Math.abs(topDown.changePct).toFixed(1)}%`,
      detail: `Median rate fell ${Math.abs(topDown.changePct).toFixed(1)}% quarter-on-quarter to ${Math.round(topDown.medianRate).toLocaleString()} AED/sqft.`,
      href: districtHref(topDown.district),
      entityType: "district",
      entityName: topDown.district,
    });
  }

  // --- 2. Volume spike, by district (last 30d vs trailing 90d baseline) --
  type Spike = { district: string; ratio: number; last30: number };
  const spikes: Spike[] = [];
  for (const d of hierarchy.districts) {
    const rows = transactions.filter((t) => t.district === d.name);
    const last30 = rows.filter((t) => t.date >= cutoff30).length;
    const baseline90 = rows.filter((t) => t.date >= cutoff120 && t.date < cutoff30).length;
    const baselineAvg30 = baseline90 / 3;
    if (baselineAvg30 < 2 || last30 < 5) continue;
    spikes.push({ district: d.name, ratio: last30 / baselineAvg30, last30 });
  }
  spikes.sort((a, b) => b.ratio - a.ratio);
  const topSpike = spikes[0];
  if (topSpike && topSpike.ratio >= 1.5) {
    insights.push({
      kind: "volume_spike",
      title: `${topSpike.district} volume spike`,
      detail: `${topSpike.last30} transactions in the last 30 days — ${topSpike.ratio.toFixed(1)}x the recent baseline.`,
      href: districtHref(topSpike.district),
      entityType: "district",
      entityName: topSpike.district,
    });
  }

  // --- 3 & 4. Supply outpacing sales + largest ask-vs-sold gap, by project
  const groups = buildListingGroups(transactions);
  const withSupplyRatio = groups
    .filter((g) => g.recentTxCount > 0)
    .map((g) => ({ g, ratio: g.listingCount / g.recentTxCount }));
  withSupplyRatio.sort((a, b) => b.ratio - a.ratio);
  const topSupply = withSupplyRatio[0];
  if (topSupply && topSupply.ratio >= 3) {
    insights.push({
      kind: "supply_outpacing",
      title: `${topSupply.g.project} — listings outpacing sales`,
      detail: `${topSupply.g.listingCount} active listings vs ${topSupply.g.recentTxCount} recent closed sales — supply is well ahead of demand.`,
      href: projectHref(topSupply.g.project),
      entityType: "project",
      entityName: topSupply.g.project,
    });
  }

  const byGap = [...groups].sort((a, b) => Math.abs(b.premiumPct) - Math.abs(a.premiumPct));
  const topGap = byGap[0];
  if (topGap && Math.abs(topGap.premiumPct) >= 5) {
    const over = topGap.premiumPct > 0;
    insights.push({
      kind: "ask_gap",
      title: `${topGap.project} — ${over ? "asking above" : "asking below"} market`,
      detail: `Listings are asking ${Math.abs(topGap.premiumPct).toFixed(1)}% ${over ? "above" : "below"} the recent ADREC median for this project.`,
      href: projectHref(topGap.project),
      entityType: "project",
      entityName: topGap.project,
    });
  }

  return insights.slice(0, limit);
}
